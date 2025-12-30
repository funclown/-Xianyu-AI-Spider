import asyncio
import base64
import json
import os
import re
import sys
import shutil
from datetime import datetime
from urllib.parse import urlencode, urlparse, urlunparse, parse_qsl

import requests

# 设置标准输出编码为UTF-8，解决Windows控制台编码问题
if sys.platform.startswith('win'):
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.detach())
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.detach())

from src.config import (
    AI_DEBUG_MODE,
    IMAGE_DOWNLOAD_HEADERS,
    IMAGE_SAVE_DIR,
    TASK_IMAGE_DIR_PREFIX,
    MODEL_NAME,
    # 已移除: NTFY_TOPIC_URL, GOTIFY_URL, GOTIFY_TOKEN, BARK_URL (2025-12-29)
    PCURL_TO_MOBILE,
    WX_BOT_URL,
    DINGTALK_BOT_URL,
    FEISHU_BOT_URL,
    WEBHOOK_URL,
    WEBHOOK_METHOD,
    WEBHOOK_HEADERS,
    WEBHOOK_CONTENT_TYPE,
    WEBHOOK_QUERY_PARAMETERS,
    WEBHOOK_BODY,
    ENABLE_RESPONSE_FORMAT,
    client,
)
from src.utils import convert_goofish_link, retry_on_failure


def safe_print(text):
    """安全的打印函数，处理编码错误"""
    try:
        print(text)
    except UnicodeEncodeError:
        # 如果遇到编码错误，尝试用ASCII编码并忽略无法编码的字符
        try:
            print(text.encode('ascii', errors='ignore').decode('ascii'))
        except:
            # 如果还是失败，打印一个简化的消息
            print("[输出包含无法显示的字符]")


@retry_on_failure(retries=2, delay=3)
async def _download_single_image(url, save_path):
    """一个带重试的内部函数，用于异步下载单个图片。"""
    loop = asyncio.get_running_loop()
    # 使用 run_in_executor 运行同步的 requests 代码，避免阻塞事件循环
    response = await loop.run_in_executor(
        None,
        lambda: requests.get(url, headers=IMAGE_DOWNLOAD_HEADERS, timeout=20, stream=True)
    )
    response.raise_for_status()
    with open(save_path, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    return save_path


async def download_all_images(product_id, image_urls, task_name="default"):
    """异步下载一个商品的所有图片。如果图片已存在则跳过。支持任务隔离。"""
    if not image_urls:
        return []

    # 为每个任务创建独立的图片目录
    task_image_dir = os.path.join(IMAGE_SAVE_DIR, f"{TASK_IMAGE_DIR_PREFIX}{task_name}")
    os.makedirs(task_image_dir, exist_ok=True)

    urls = [url.strip() for url in image_urls if url.strip().startswith('http')]
    if not urls:
        return []

    saved_paths = []
    total_images = len(urls)
    for i, url in enumerate(urls):
        try:
            clean_url = url.split('.heic')[0] if '.heic' in url else url
            file_name_base = os.path.basename(clean_url).split('?')[0]
            file_name = f"product_{product_id}_{i + 1}_{file_name_base}"
            file_name = re.sub(r'[\\/*?:"<>|]', "", file_name)
            if not os.path.splitext(file_name)[1]:
                file_name += ".jpg"

            save_path = os.path.join(task_image_dir, file_name)

            if os.path.exists(save_path):
                safe_print(f"   [图片] 图片 {i + 1}/{total_images} 已存在，跳过下载: {os.path.basename(save_path)}")
                saved_paths.append(save_path)
                continue

            safe_print(f"   [图片] 正在下载图片 {i + 1}/{total_images}: {url}")
            if await _download_single_image(url, save_path):
                safe_print(f"   [图片] 图片 {i + 1}/{total_images} 已成功下载到: {os.path.basename(save_path)}")
                saved_paths.append(save_path)
        except Exception as e:
            safe_print(f"   [图片] 处理图片 {url} 时发生错误，已跳过此图: {e}")

    return saved_paths


def cleanup_task_images(task_name):
    """清理指定任务的图片目录"""
    task_image_dir = os.path.join(IMAGE_SAVE_DIR, f"{TASK_IMAGE_DIR_PREFIX}{task_name}")
    if os.path.exists(task_image_dir):
        try:
            shutil.rmtree(task_image_dir)
            safe_print(f"   [清理] 已删除任务 '{task_name}' 的临时图片目录: {task_image_dir}")
        except Exception as e:
            safe_print(f"   [清理] 删除任务 '{task_name}' 的临时图片目录时出错: {e}")
    else:
        safe_print(f"   [清理] 任务 '{task_name}' 的临时图片目录不存在: {task_image_dir}")


def encode_image_to_base64(image_path):
    """将本地图片文件编码为 Base64 字符串。"""
    if not image_path or not os.path.exists(image_path):
        return None
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        safe_print(f"编码图片时出错: {e}")
        return None


def validate_ai_response_format(parsed_response):
    """验证AI响应的格式是否符合预期结构"""
    required_fields = [
        "prompt_version",
        "is_recommended",
        "reason",
        "risk_tags",
        "criteria_analysis"
    ]

    criteria_analysis_fields = [
        "model_chip",
        "battery_health",
        "condition",
        "history",
        "seller_type",
        "shipping",
        "seller_credit"
    ]

    seller_type_fields = [
        "status",
        "persona",
        "comment",
        "analysis_details"
    ]

    # 检查顶层字段
    for field in required_fields:
        if field not in parsed_response:
            safe_print(f"   [AI分析] 警告：响应缺少必需字段 '{field}'")
            return False

    # 检查criteria_analysis字段
    criteria_analysis = parsed_response.get("criteria_analysis", {})
    for field in criteria_analysis_fields:
        if field not in criteria_analysis:
            safe_print(f"   [AI分析] 警告：criteria_analysis缺少字段 '{field}'")
            return False

    # 检查seller_type的analysis_details
    seller_type = criteria_analysis.get("seller_type", {})
    if "analysis_details" in seller_type:
        analysis_details = seller_type["analysis_details"]
        required_details = ["temporal_analysis", "selling_behavior", "buying_behavior", "behavioral_summary"]
        for detail in required_details:
            if detail not in analysis_details:
                safe_print(f"   [AI分析] 警告：analysis_details缺少字段 '{detail}'")
                return False

    # 检查数据类型
    if not isinstance(parsed_response.get("is_recommended"), bool):
        safe_print("   [AI分析] 警告：is_recommended字段不是布尔类型")
        return False

    if not isinstance(parsed_response.get("risk_tags"), list):
        safe_print("   [AI分析] 警告：risk_tags字段不是列表类型")
        return False

    return True


@retry_on_failure(retries=3, delay=5)
async def send_ntfy_notification(product_data, reason):
    """当发现推荐商品时，异步发送通知。支持企业微信、钉钉、飞书、通用Webhook"""
    if not WX_BOT_URL and not DINGTALK_BOT_URL and not FEISHU_BOT_URL and not WEBHOOK_URL:
        safe_print("警告：未在 .env 文件中配置任何通知服务 (WX_BOT_URL, DINGTALK_BOT_URL, FEISHU_BOT_URL, WEBHOOK_URL)，跳过通知。")
        return

    title = product_data.get('商品标题', 'N/A')
    price = product_data.get('当前售价', 'N/A')
    link = product_data.get('商品链接', '#')
    if PCURL_TO_MOBILE:
        mobile_link = convert_goofish_link(link)
        message = f"价格: {price}\nAI建议: {reason}\n手机端链接: {mobile_link}\n电脑端链接: {link}"
    else:
        message = f"价格: {price}\nAI建议: {reason}\n链接: {link}"

    notification_title = f"🚨 新推荐! {title[:30]}..."

    # --- 发送企业微信机器人通知 ---
    if WX_BOT_URL:
        # 将消息转换为Markdown格式，使链接可点击
        lines = message.split('\n')
        markdown_content = f"## {notification_title}\n\n"

        for line in lines:
            if line.startswith('手机端链接:') or line.startswith('电脑端链接:') or line.startswith('链接:'):
                # 提取链接部分并转换为Markdown超链接
                if ':' in line:
                    label, url = line.split(':', 1)
                    url = url.strip()
                    if url and url != '#':
                        markdown_content += f"- **{label}:** [{url}]({url})\n"
                    else:
                        markdown_content += f"- **{label}:** 暂无链接\n"
                else:
                    markdown_content += f"- {line}\n"
            else:
                # 其他行保持原样
                if line:
                    markdown_content += f"- {line}\n"
                else:
                    markdown_content += "\n"

        payload = {
            "msgtype": "markdown",
            "markdown": {
                "content": markdown_content
            }
        }

        try:
            safe_print(f"   -> 正在发送企业微信通知到: {WX_BOT_URL}")
            headers = { "Content-Type": "application/json" }
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.post(
                    WX_BOT_URL,
                    json=payload,
                    headers=headers,
                    timeout=10
                )
            )
            response.raise_for_status()
            result = response.json()
            safe_print(f"   -> 企业微信通知发送成功。响应: {result}")
        except requests.exceptions.RequestException as e:
            safe_print(f"   -> 发送企业微信通知失败: {e}")
        except Exception as e:
            safe_print(f"   -> 发送企业微信通知时发生未知错误: {e}")

    # --- 发送钉钉机器人通知 ---
    if DINGTALK_BOT_URL:
        try:
            safe_print(f"   -> 正在发送钉钉机器人通知...")

            # 构建钉钉消息内容
            dingtalk_message = f"## {notification_title}\n\n"
            dingtalk_message += f"### {title[:50]}...\n\n"
            dingtalk_message += f"**价格**: {price}\n\n"
            dingtalk_message += f"**AI建议**: {reason}\n\n"

            # 添加链接
            if PCURL_TO_MOBILE:
                mobile_link = convert_goofish_link(link)
                dingtalk_message += f"📱 [手机端链接]({mobile_link})\n\n"
            dingtalk_message += f"💻 [电脑端链接]({link})"

            # 钉钉使用Markdown格式
            dingtalk_payload = {
                "msgtype": "markdown",
                "markdown": {
                    "title": notification_title,
                    "text": dingtalk_message
                }
            }

            headers = {"Content-Type": "application/json"}
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.post(
                    DINGTALK_BOT_URL,
                    json=dingtalk_payload,
                    headers=headers,
                    timeout=10
                )
            )
            response.raise_for_status()
            result = response.json()
            if result.get("errcode") == 0:
                safe_print("   -> 钉钉机器人通知发送成功。")
            else:
                safe_print(f"   -> 钉钉机器人通知发送失败: {result.get('errmsg', '未知错误')}")
        except requests.exceptions.RequestException as e:
            safe_print(f"   -> 发送钉钉机器人通知失败: {e}")
        except Exception as e:
            safe_print(f"   -> 发送钉钉机器人通知时发生未知错误: {e}")

    # --- 发送飞书机器人通知 ---
    if FEISHU_BOT_URL:
        try:
            safe_print(f"   -> 正在发送飞书机器人通知...")

            # 构建飞书消息内容（富文本格式）
            feishu_title = notification_title
            feishu_text = f"**{title[:50]}...**\n\n"
            feishu_text += f"价格: {price}\n\n"
            feishu_text += f"AI建议: {reason}\n\n"

            # 添加链接
            if PCURL_TO_MOBILE:
                mobile_link = convert_goofish_link(link)
                feishu_text += f"[手机端链接]({mobile_link})\n"
            feishu_text += f"[电脑端链接]({link})"

            # 飞书使用post类型（富文本）
            feishu_payload = {
                "msg_type": "post",
                "content": {
                    "post": {
                        "zh_cn": {
                            "title": feishu_title,
                            "content": [
                                [{
                                    "tag": "text",
                                    "text": feishu_text
                                }]
                            ]
                        }
                    }
                }
            }

            headers = {"Content-Type": "application/json"}
            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None,
                lambda: requests.post(
                    FEISHU_BOT_URL,
                    json=feishu_payload,
                    headers=headers,
                    timeout=10
                )
            )
            response.raise_for_status()
            result = response.json()
            if result.get("StatusCode") == 0 or result.get("code") == 0:
                safe_print("   -> 飞书机器人通知发送成功。")
            else:
                safe_print(f"   -> 飞书机器人通知发送失败: {result.get('msg', '未知错误')}")
        except requests.exceptions.RequestException as e:
            safe_print(f"   -> 发送飞书机器人通知失败: {e}")
        except Exception as e:
            safe_print(f"   -> 发送飞书机器人通知时发生未知错误: {e}")

    # --- 发送通用 Webhook 通知 ---
    if WEBHOOK_URL:
        try:
            safe_print(f"   -> 正在发送通用 Webhook 通知到: {WEBHOOK_URL}")

            # 替换占位符
            def replace_placeholders(template_str):
                if not template_str:
                    return ""
                # 对内容进行JSON转义，避免换行符和特殊字符破坏JSON格式
                safe_title = json.dumps(notification_title, ensure_ascii=False)[1:-1]  # 去掉外层引号
                safe_content = json.dumps(message, ensure_ascii=False)[1:-1]  # 去掉外层引号
                # 同时支持旧的${title}${content}和新的{{title}}{{content}}格式
                return template_str.replace("${title}", safe_title).replace("${content}", safe_content).replace("{{title}}", safe_title).replace("{{content}}", safe_content)

            # 准备请求头
            headers = {}
            if WEBHOOK_HEADERS:
                try:
                    headers = json.loads(WEBHOOK_HEADERS)
                except json.JSONDecodeError:
                    safe_print(f"   -> [警告] Webhook 请求头格式错误，请检查 .env 中的 WEBHOOK_HEADERS。")

            loop = asyncio.get_running_loop()

            if WEBHOOK_METHOD == "GET":
                # 准备查询参数
                final_url = WEBHOOK_URL
                if WEBHOOK_QUERY_PARAMETERS:
                    try:
                        params_str = replace_placeholders(WEBHOOK_QUERY_PARAMETERS)
                        params = json.loads(params_str)

                        # 解析原始URL并追加新参数
                        url_parts = list(urlparse(final_url))
                        query = dict(parse_qsl(url_parts[4]))
                        query.update(params)
                        url_parts[4] = urlencode(query)
                        final_url = urlunparse(url_parts)
                    except json.JSONDecodeError:
                        safe_print(f"   -> [警告] Webhook 查询参数格式错误，请检查 .env 中的 WEBHOOK_QUERY_PARAMETERS。")

                response = await loop.run_in_executor(
                    None,
                    lambda: requests.get(final_url, headers=headers, timeout=15)
                )

            elif WEBHOOK_METHOD == "POST":
                # 准备请求体
                data = None
                json_payload = None

                if WEBHOOK_BODY:
                    body_str = replace_placeholders(WEBHOOK_BODY)
                    try:
                        if WEBHOOK_CONTENT_TYPE == "JSON":
                            json_payload = json.loads(body_str)
                            if 'Content-Type' not in headers and 'content-type' not in headers:
                                headers['Content-Type'] = 'application/json; charset=utf-8'
                        elif WEBHOOK_CONTENT_TYPE == "FORM":
                            data = json.loads(body_str)  # requests会处理url-encoding
                            if 'Content-Type' not in headers and 'content-type' not in headers:
                                headers['Content-Type'] = 'application/x-www-form-urlencoded'
                        else:
                            safe_print(f"   -> [警告] 不支持的 WEBHOOK_CONTENT_TYPE: {WEBHOOK_CONTENT_TYPE}。")
                    except json.JSONDecodeError:
                        safe_print(f"   -> [警告] Webhook 请求体格式错误，请检查 .env 中的 WEBHOOK_BODY。")

                response = await loop.run_in_executor(
                    None,
                    lambda: requests.post(WEBHOOK_URL, headers=headers, json=json_payload, data=data, timeout=15)
                )
            else:
                safe_print(f"   -> [警告] 不支持的 WEBHOOK_METHOD: {WEBHOOK_METHOD}。")
                return

            response.raise_for_status()
            safe_print(f"   -> Webhook 通知发送成功。状态码: {response.status_code}")

        except requests.exceptions.RequestException as e:
            safe_print(f"   -> 发送 Webhook 通知失败: {e}")
        except Exception as e:
            safe_print(f"   -> 发送 Webhook 通知时发生未知错误: {e}")


@retry_on_failure(retries=3, delay=5)
async def get_ai_analysis(product_data, image_paths=None, prompt_text=""):
    """将完整的商品JSON数据和所有图片发送给 AI 进行分析（异步）。"""
    if not client:
        safe_print("   [AI分析] 错误：AI客户端未初始化，跳过分析。")
        return None

    item_info = product_data.get('商品信息', {})
    product_id = item_info.get('商品ID', 'N/A')

    safe_print(f"\n   [AI分析] 开始分析商品 #{product_id} (含 {len(image_paths or [])} 张图片)...")
    safe_print(f"   [AI分析] 标题: {item_info.get('商品标题', '无')}")

    if not prompt_text:
        safe_print("   [AI分析] 错误：未提供AI分析所需的prompt文本。")
        return None

    product_details_json = json.dumps(product_data, ensure_ascii=False, indent=2)
    system_prompt = prompt_text

    if AI_DEBUG_MODE:
        safe_print("\n--- [AI DEBUG] ---")
        safe_print("--- PRODUCT DATA (JSON) ---")
        safe_print(product_details_json)
        safe_print("--- PROMPT TEXT (完整内容) ---")
        safe_print(prompt_text)
        safe_print("-------------------\n")

    combined_text_prompt = f"""请基于你的专业知识和我的要求，分析以下完整的商品JSON数据：

```json
    {product_details_json}
```

{system_prompt}
"""
    user_content_list = []

    # 先添加图片内容
    if image_paths:
        for path in image_paths:
            base64_image = encode_image_to_base64(path)
            if base64_image:
                user_content_list.append(
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}})

    # 再添加文本内容
    user_content_list.append({"type": "text", "text": combined_text_prompt})

    messages = [{"role": "user", "content": user_content_list}]

    # 保存最终传输内容到日志文件
    try:
        # 创建logs文件夹
        logs_dir = "logs"
        os.makedirs(logs_dir, exist_ok=True)

        # 生成日志文件名（当前时间）
        current_time = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_filename = f"{current_time}.log"
        log_filepath = os.path.join(logs_dir, log_filename)

        # 准备日志内容 - 直接保存原始传输内容
        log_content = json.dumps(messages, ensure_ascii=False)

        # 写入日志文件
        with open(log_filepath, 'w', encoding='utf-8') as f:
            f.write(log_content)

        safe_print(f"   [日志] AI分析请求已保存到: {log_filepath}")

    except Exception as e:
        safe_print(f"   [日志] 保存AI分析日志时出错: {e}")

    # 增强的AI调用，包含更严格的格式控制和重试机制
    max_retries = 3
    for attempt in range(max_retries):
        try:
            # 根据重试次数调整参数
            current_temperature = 0.1 if attempt == 0 else 0.05  # 重试时使用更低的温度

            from src.config import get_ai_request_params
            
            # 构建请求参数，根据ENABLE_RESPONSE_FORMAT决定是否使用response_format
            request_params = {
                "model": MODEL_NAME,
                "messages": messages,
                "temperature": current_temperature,
                "max_tokens": 4000
            }
            
            # 只有启用response_format时才添加该参数
            if ENABLE_RESPONSE_FORMAT:
                request_params["response_format"] = {"type": "json_object"}
            
            response = await client.chat.completions.create(
                **get_ai_request_params(**request_params)
            )

            ai_response_content = response.choices[0].message.content

            if AI_DEBUG_MODE:
                safe_print(f"\n--- [AI DEBUG] 第{attempt + 1}次尝试 ---")
                safe_print("--- RAW AI RESPONSE ---")
                safe_print(ai_response_content)
                safe_print("---------------------\n")

            # 尝试直接解析JSON
            try:
                parsed_response = json.loads(ai_response_content)

                # 验证响应格式
                if validate_ai_response_format(parsed_response):
                    safe_print(f"   [AI分析] 第{attempt + 1}次尝试成功，响应格式验证通过")
                    return parsed_response
                else:
                    safe_print(f"   [AI分析] 第{attempt + 1}次尝试格式验证失败")
                    if attempt < max_retries - 1:
                        safe_print(f"   [AI分析] 准备第{attempt + 2}次重试...")
                        continue
                    else:
                        safe_print("   [AI分析] 所有重试完成，使用最后一次结果")
                        return parsed_response

            except json.JSONDecodeError:
                safe_print(f"   [AI分析] 第{attempt + 1}次尝试JSON解析失败，尝试清理响应内容...")

                # 清理可能的Markdown代码块标记
                cleaned_content = ai_response_content.strip()
                if cleaned_content.startswith('```json'):
                    cleaned_content = cleaned_content[7:]
                if cleaned_content.startswith('```'):
                    cleaned_content = cleaned_content[3:]
                if cleaned_content.endswith('```'):
                    cleaned_content = cleaned_content[:-3]
                cleaned_content = cleaned_content.strip()

                # 寻找JSON对象边界
                json_start_index = cleaned_content.find('{')
                json_end_index = cleaned_content.rfind('}')

                if json_start_index != -1 and json_end_index != -1 and json_end_index > json_start_index:
                    json_str = cleaned_content[json_start_index:json_end_index + 1]
                    try:
                        parsed_response = json.loads(json_str)
                        if validate_ai_response_format(parsed_response):
                            safe_print(f"   [AI分析] 第{attempt + 1}次尝试清理后成功")
                            return parsed_response
                        else:
                            if attempt < max_retries - 1:
                                safe_print(f"   [AI分析] 准备第{attempt + 2}次重试...")
                                continue
                            else:
                                safe_print("   [AI分析] 所有重试完成，使用清理后的结果")
                                return parsed_response
                    except json.JSONDecodeError as e:
                        safe_print(f"   [AI分析] 第{attempt + 1}次尝试清理后JSON解析仍然失败: {e}")
                        if attempt < max_retries - 1:
                            safe_print(f"   [AI分析] 准备第{attempt + 2}次重试...")
                            continue
                        else:
                            raise e
                else:
                    safe_print(f"   [AI分析] 第{attempt + 1}次尝试无法在响应中找到有效的JSON对象")
                    if attempt < max_retries - 1:
                        safe_print(f"   [AI分析] 准备第{attempt + 2}次重试...")
                        continue
                    else:
                        raise json.JSONDecodeError("No valid JSON object found", ai_response_content, 0)

        except Exception as e:
            safe_print(f"   [AI分析] 第{attempt + 1}次尝试AI调用失败: {e}")
            if attempt < max_retries - 1:
                safe_print(f"   [AI分析] 准备第{attempt + 2}次重试...")
                continue
            else:
                raise e
