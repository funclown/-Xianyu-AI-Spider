document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('.nav-link');
    let logRefreshInterval = null;
    let taskRefreshInterval = null;

    // --- Templates for each section ---
    const templates = {
        tasks: () => `
            <section id="tasks-section" class="content-section">
                <div class="section-header">
                    <h2>任务管理</h2>
                    <button id="add-task-btn" class="control-button primary-btn">➕ 创建新任务</button>
                </div>
                <div id="tasks-table-container">
                    <p>正在加载任务列表...</p>
                </div>
            </section>`,
        results: () => `
            <section id="results-section" class="content-section">
                <div class="results-page-header">
                    <h2>结果查看</h2>
                    <p class="results-page-subtitle">查看和管理 AI 分析结果</p>
                </div>

                <!-- Statistics Cards -->
                <div class="results-stats-container" id="results-stats" style="display: none;">
                    <div class="result-stat-card">
                        <div class="stat-icon">📊</div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-total">0</div>
                            <div class="stat-label">总结果数</div>
                        </div>
                    </div>
                    <div class="result-stat-card recommended">
                        <div class="stat-icon">✨</div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-recommended">0</div>
                            <div class="stat-label">AI推荐</div>
                        </div>
                    </div>
                    <div class="result-stat-card not-recommended">
                        <div class="stat-icon">⚠️</div>
                        <div class="stat-content">
                            <div class="stat-value" id="stat-not-recommended">0</div>
                            <div class="stat-label">不推荐</div>
                        </div>
                    </div>
                </div>

                <div class="results-filter-bar">
                    <div class="filter-group">
                        <label class="filter-label">📁 数据集</label>
                        <select id="result-file-selector" class="modern-select"><option>加载中...</option></select>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">筛选</label>
                        <label class="filter-checkbox">
                            <div class="checkbox-content">
                                <input type="checkbox" id="recommended-only-checkbox">
                                <span class="checkbox-text">✨ 仅看AI推荐</span>
                            </div>
                        </label>
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">🔍 搜索</label>
                        <input type="text" id="search-input" class="search-input" placeholder="搜索商品标题或卖家...">
                    </div>

                    <div class="filter-group">
                        <label class="filter-label">📅 排序</label>
                        <div class="sort-selects">
                            <select id="sort-by-selector" class="modern-select">
                                <option value="crawl_time">按爬取时间</option>
                                <option value="publish_time">按发布时间</option>
                                <option value="price">按价格</option>
                            </select>
                            <select id="sort-order-selector" class="modern-select">
                                <option value="desc">降序</option>
                                <option value="asc">升序</option>
                            </select>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button id="refresh-results-btn" class="modern-btn refresh-btn">
                            <span class="btn-icon">🔄</span>
                            <span class="btn-text">刷新</span>
                        </button>
                        <button id="delete-results-btn" class="modern-btn delete-btn" disabled>
                            <span class="btn-icon">🗑️</span>
                            <span class="btn-text">删除</span>
                        </button>
                    </div>
                </div>

                <div id="results-grid-container">
                    <div class="empty-state">
                        <div class="empty-state-icon">📦</div>
                        <h3>暂无数据</h3>
                        <p>请先选择一个结果文件，或者运行监控任务获取数据。</p>
                    </div>
                </div>
            </section>`,
        logs: () => `
            <section id="logs-section" class="content-section">
                <div class="section-header">
                    <h2>运行日志</h2>
                    <div class="log-controls">
                        <label>
                            <input type="checkbox" id="auto-refresh-logs-checkbox">
                            自动刷新
                        </label>
                        <button id="refresh-logs-btn" class="control-button">🔄 刷新</button>
                        <button id="clear-logs-btn" class="control-button danger-btn">🗑️ 清空日志</button>
                    </div>
                </div>
                <pre id="log-content-container">正在加载日志...</pre>
            </section>`,
        settings: () => `
            <section id="settings-section" class="content-section">
                <div class="settings-page-header">
                    <h2>系统设置</h2>
                    <p class="settings-page-subtitle">配置系统参数和偏好设置</p>
                </div>

                <div class="settings-grid">
                    <!-- 系统状态卡片 -->
                    <div class="setting-card status-card">
                        <div class="setting-card-header">
                            <div class="setting-card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                                </svg>
                            </div>
                            <div>
                                <h3>系统状态</h3>
                                <p class="setting-card-desc">检查系统运行状态</p>
                            </div>
                        </div>
                        <div id="system-status-container" class="setting-card-body">
                            <p>正在加载状态...</p>
                        </div>
                    </div>

                    <!-- AI模型设置卡片 -->
                    <div class="setting-card ai-card">
                        <div class="setting-card-header">
                            <div class="setting-card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                    <path d="M2 17l10 5 10-5"/>
                                    <path d="M2 12l10 5 10-5"/>
                                </svg>
                            </div>
                            <div>
                                <h3>AI模型设置</h3>
                                <p class="setting-card-desc">配置AI分析引擎</p>
                            </div>
                        </div>
                        <div id="ai-settings-container" class="setting-card-body">
                            <p>正在加载AI配置...</p>
                        </div>
                    </div>

                    <!-- 通知设置卡片 -->
                    <div class="setting-card notification-card">
                        <div class="setting-card-header">
                            <div class="setting-card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                                </svg>
                            </div>
                            <div>
                                <h3>通知设置</h3>
                                <p class="setting-card-desc">管理消息推送渠道</p>
                            </div>
                        </div>
                        <div id="notification-settings-container" class="setting-card-body">
                            <p>正在加载通知配置...</p>
                        </div>
                    </div>

                    <!-- Prompt管理卡片 -->
                    <div class="setting-card prompt-card">
                        <div class="setting-card-header">
                            <div class="setting-card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10 9 9 9 8 9"/>
                                </svg>
                            </div>
                            <div>
                                <h3>Prompt管理</h3>
                                <p class="setting-card-desc">编辑AI分析模板</p>
                            </div>
                        </div>
                        <div class="setting-card-body">
                            <div class="prompt-manager">
                                <div class="prompt-list-container">
                                    <label for="prompt-selector">选择要编辑的 Prompt:</label>
                                    <select id="prompt-selector"><option>加载中...</option></select>
                                </div>
                                <div class="prompt-editor-container">
                                    <textarea id="prompt-editor" spellcheck="false" disabled placeholder="请先从上方选择一个 Prompt 文件进行编辑..."></textarea>
                                    <button id="save-prompt-btn" class="control-button primary-btn" disabled>保存更改</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 管理员设置卡片 -->
                    <div class="setting-card admin-card">
                        <div class="setting-card-header">
                            <div class="setting-card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                            <div>
                                <h3>管理员设置</h3>
                                <p class="setting-card-desc">管理管理员账户和密码</p>
                            </div>
                        </div>
                        <div id="admin-settings-container" class="setting-card-body">
                            <p>正在加载管理员配置...</p>
                        </div>
                    </div>

                    <!-- 日志管理卡片 -->
                    <div class="setting-card">
                        <div class="setting-card-header">
                            <div class="setting-card-icon">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10 9 9 9 8 9"/>
                                </svg>
                            </div>
                            <div>
                                <h3>日志管理</h3>
                                <p class="setting-card-desc">清理旧日志释放磁盘空间</p>
                            </div>
                        </div>
                        <div id="logs-management-container" class="setting-card-body">
                            <p>正在加载日志信息...</p>
                        </div>
                    </div>
                </div>
            </section>`
    };

    // --- API Functions ---
    async function fetchNotificationSettings() {
        try {
            const response = await fetch('/api/settings/notifications');
            if (!response.ok) throw new Error('无法获取通知设置');
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    async function fetchAISettings() {
        try {
            const response = await fetch('/api/settings/ai');
            if (!response.ok) throw new Error('无法获取AI设置');
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    // 商业代理API函数
    async function fetchCommercialProxyConfig() {
        try {
            const response = await fetch('/api/settings/commercial-proxy');
            if (!response.ok) throw new Error('无法获取商业代理配置');
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    async function updateCommercialProxyConfig(config) {
        try {
            const response = await fetch('/api/settings/commercial-proxy', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(config),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '更新商业代理配置失败');
            }
            return await response.json();
        } catch (error) {
            console.error('无法更新商业代理配置:', error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function extractCommercialProxies() {
        try {
            const response = await fetch('/api/settings/commercial-proxy/extract', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '提取商业代理失败');
            }
            return await response.json();
        } catch (error) {
            console.error('无法提取商业代理:', error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function validateProxyApi(url) {
        try {
            const response = await fetch('/api/settings/proxies/validate', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({url: url}),
            });
            if (!response.ok) throw new Error('代理验证请求失败');
            return await response.json();
        } catch (error) {
            console.error('无法验证代理:', error);
            return {success: false, message: error.message};
        }
    }

    // ========================================================================
    // [已移除 - 2025-12-29] 代理池API函数
    // 原功能：代理池相关的所有前端API调用
    // 原函数：
    //   - fetchProxyPoolConfig() - 获取代理池配置
    //   - fetchProxyPoolStatus() - 获取代理池状态
    //   - updateProxyPoolConfig() - 更新代理池配置
    //   - extractProxies() - 提取代理
    //   - testProxyConnection() - 测试代理连接
    //   - fetchProxyPoolActivity() - 获取活动日志
    //   - updateProxyPoolStatus() - 更新代理池状态显示
    //   - updateProxyPoolActivity() - 更新代理池活动显示
    // 移除原因：代理池功能不好用，后续重新规划
    // ========================================================================

    // ========================================================================
    // [已移除 - 2025-12-29] 代理池UI渲染和测试函数
    // 原函数：
    //   - renderProxyPoolStatus() - 渲染代理池状态卡片
    //   - renderProxyPoolActivity() - 渲染代理池活动日志
    //   - loadAndDisplayProxyList() - 加载并显示代理列表
    //   - saveProxyListFromUI() - 保存代理列表
    //   - addSingleProxy() - 添加单个代理
    //   - testSingleProxy() - 测试单个代理
    //   - clearProxyList() - 清空代理列表
    // 移除原因：代理池功能不好用，后续重新规划
    // ========================================================================

    // 获取认证头
    function getAuthHeaders() {
        return {}; // 如果需要认证，可以在这里添加
    }

    async function updateAISettings(settings) {
        try {
            const response = await fetch('/api/settings/ai', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(settings),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '更新AI设置失败');
            }
            return await response.json();
        } catch (error) {
            console.error('无法更新AI设置:', error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function testAISettings(settings) {
        try {
            const response = await fetch('/api/settings/ai/test', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(settings),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '测试AI设置失败');
            }
            return await response.json();
        } catch (error) {
            console.error('无法测试AI设置:', error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function updateNotificationSettings(settings) {
        try {
            const response = await fetch('/api/settings/notifications', {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(settings),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '更新通知设置失败');
            }
            return await response.json();
        } catch (error) {
            console.error('无法更新通知设置:', error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function fetchPrompts() {
        try {
            const response = await fetch('/api/prompts');
            if (!response.ok) throw new Error('无法获取Prompt列表');
            return await response.json();
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    async function fetchPromptContent(filename) {
        try {
            const response = await fetch(`/api/prompts/${filename}`);
            if (!response.ok) throw new Error(`无法获取Prompt文件 ${filename} 的内容`);
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    async function updatePrompt(filename, content) {
        try {
            const response = await fetch(`/api/prompts/${filename}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({content: content}),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '更新Prompt失败');
            }
            return await response.json();
        } catch (error) {
            console.error(`无法更新Prompt ${filename}:`, error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function createTaskWithAI(data) {
        try {
            const response = await fetch(`/api/tasks/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '通过AI创建任务失败');
            }
            console.log(`AI任务创建成功!`);
            return await response.json();
        } catch (error) {
            console.error(`无法通过AI创建任务:`, error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function startSingleTask(taskId) {
        try {
            const response = await fetch(`/api/tasks/start/${taskId}`, {
                method: 'POST',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '启动任务失败');
            }
            return await response.json();
        } catch (error) {
            console.error(`无法启动任务 ${taskId}:`, error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function stopSingleTask(taskId) {
        try {
            const response = await fetch(`/api/tasks/stop/${taskId}`, {
                method: 'POST',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '停止任务失败');
            }
            return await response.json();
        } catch (error) {
            console.error(`无法停止任务 ${taskId}:`, error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function stopAllTasks() {
        try {
            const response = await fetch('/api/tasks/stop-all', {
                method: 'POST',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '停止所有任务失败');
            }
            const data = await response.json();
            alert(data.message || `已停止 ${data.stopped_count} 个任务`);
            return data;
        } catch (error) {
            console.error('停止所有任务时出错:', error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function deleteTask(taskId) {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '删除任务失败');
            }
            console.log(`任务 ${taskId} 删除成功!`);
            return await response.json();
        } catch (error) {
            console.error(`无法删除任务 ${taskId}:`, error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function updateTask(taskId, data) {
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '更新任务失败');
            }
            console.log(`任务 ${taskId} 更新成功!`);
            return await response.json();
        } catch (error) {
            console.error(`无法更新任务 ${taskId}:`, error);
            // TODO: Use a more elegant notification system
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function fetchTasks() {
        try {
            const response = await fetch('/api/tasks');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("无法获取任务列表:", error);
            return null;
        }
    }

    async function fetchResultFiles() {
        try {
            const response = await fetch('/api/results/files');
            if (!response.ok) throw new Error('无法获取结果文件列表');
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    async function deleteResultFile(filename) {
        try {
            const response = await fetch(`/api/results/files/${filename}`, {
                method: 'DELETE',
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || '删除结果文件失败');
            }
            return await response.json();
        } catch (error) {
            console.error(`无法删除结果文件 ${filename}:`, error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function fetchResultContent(filename, recommendedOnly, sortBy, sortOrder, limit = 100) {
        try {
            const params = new URLSearchParams({
                page: 1,
                limit: limit,
                recommended_only: recommendedOnly,
                sort_by: sortBy,
                sort_order: sortOrder
            });
            const response = await fetch(`/api/results/${filename}?${params}`);
            if (!response.ok) throw new Error(`无法获取文件 ${filename} 的内容`);
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    async function fetchSystemStatus() {
        try {
            const response = await fetch('/api/settings/status');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("无法获取系统状态:", error);
            return null;
        }
    }

    async function loadOpenAICredit() {
        try {
            const response = await fetch('/api/openai/credit');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const credit = await response.json();
            updateCreditStatus(credit);
        } catch (error) {
            console.error("无法获取OpenAI额度:", error);
            updateCreditStatus({error: error.message});
        }
    }

    function updateCreditStatus(credit) {
        const creditStatusEl = document.getElementById('credit-status');
        if (!creditStatusEl) return;

        if (credit.error) {
            creditStatusEl.innerHTML = `<span class="warning-text">⚠️ 查询失败</span>`;
            creditStatusEl.title = credit.error;
        } else if (credit.provider === 'qwen') {
            // 千问/阿里云DashScope API
            creditStatusEl.innerHTML = `<span class="system-status-value">🌟 千问</span>`;
            creditStatusEl.style.cursor = 'pointer';
            creditStatusEl.title = `${credit.provider_name}\n${credit.message}\n\n点击打开控制台查看额度`;

            // 添加点击事件
            creditStatusEl.onclick = () => {
                if (credit.usage_url) {
                    window.open(credit.usage_url, '_blank');
                } else if (credit.console_url) {
                    window.open(credit.console_url, '_blank');
                }
            };
        } else if (!credit.is_official) {
            // 其他非官方API
            creditStatusEl.innerHTML = `<span class="system-status-value">🔒 ${credit.provider_name || '第三方API'}</span>`;
            creditStatusEl.title = credit.message || '非官方API无法查询额度';
        } else if (credit.remaining !== null) {
            // OpenAI官方API - 显示额度
            const percentage = credit.total_available > 0
                ? ((credit.remaining / credit.total_available) * 100).toFixed(1)
                : 0;

            let statusColor = '#52C41A';
            if (percentage < 20) statusColor = '#FF4D4F';
            else if (percentage < 50) statusColor = '#FA8C16';

            creditStatusEl.innerHTML = `
                <span style="color: ${statusColor}; font-weight: 500;">
                    $${credit.remaining.toFixed(2)} / $${credit.total_available.toFixed(2)}
                    (${percentage}%)
                </span>
            `;
            creditStatusEl.title = `已用: $${credit.total_used.toFixed(4)}\n剩余: $${credit.remaining.toFixed(4)}\n总额: $${credit.total_available.toFixed(4)}\n有效期至: ${credit.access_until || '未知'}`;
        } else {
            creditStatusEl.innerHTML = `<span class="warning-text">⚠️ 未知</span>`;
        }
    }

    // Browser mode functions
    async function fetchBrowserMode() {
        try {
            const response = await fetch('/api/browser/mode');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("无法获取浏览器模式:", error);
            return { headless: true, mode: "headless" };
        }
    }

    async function updateBrowserMode(headless) {
        try {
            const response = await fetch('/api/browser/mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ headless: headless })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("无法更新浏览器模式:", error);
            throw error;
        }
    }

    async function initializeBrowserMode() {
        const mode = await fetchBrowserMode();
        const toggle = document.getElementById('browser-mode-toggle');
        const label = document.getElementById('browser-mode-label');

        if (toggle && label) {
            toggle.checked = mode.headless;
            label.textContent = mode.mode === "headless" ? "无头模式" : "有头模式";

            // Add change event listener
            toggle.addEventListener('change', async (event) => {
                const headless = event.target.checked;
                const newMode = headless ? "headless" : "headed";

                try {
                    const result = await updateBrowserMode(headless);
                    if (result.success) {
                        label.textContent = newMode === "headless" ? "无头模式" : "有头模式";
                        alert(result.message || "浏览器模式已更新");
                    } else {
                        // Revert toggle on failure
                        event.target.checked = !headless;
                        alert("更新失败");
                    }
                } catch (error) {
                    console.error("Failed to update browser mode:", error);
                    event.target.checked = !headless;
                    alert("更新失败: " + error.message);
                }
            });
        }
    }

    async function clearLogs() {
        try {
            const response = await fetch('/api/logs', {method: 'DELETE'});
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || '清空日志失败');
            }
            return await response.json();
        } catch (error) {
            console.error("无法清空日志:", error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function deleteLoginState() {
        try {
            const response = await fetch('/api/login-state', {method: 'DELETE'});
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || '删除登录凭证失败');
            }
            return await response.json();
        } catch (error) {
            console.error("无法删除登录凭证:", error);
            alert(`错误: ${error.message}`);
            return null;
        }
    }

    async function fetchLogs(fromPos = 0) {
        try {
            const response = await fetch(`/api/logs?from_pos=${fromPos}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("无法获取日志:", error);
            return {new_content: `\n加载日志失败: ${error.message}`, new_pos: fromPos};
        }
    }

    // --- Render Functions ---
    function renderLoginStatusWidget(status) {
        const container = document.getElementById('login-status-widget-container');
        if (!container) return;

        const loginState = status.login_state || {};
        let content = '';

        if (loginState.exists && loginState.valid) {
            // 已登录
            content = `
                <div class="login-status-widget">
                    <span class="status-text status-ok">✓ 已登录</span>
                    <div class="dropdown-menu">
                        <a href="#" class="dropdown-item" id="update-login-state-btn-widget">手动更新</a>
                        <a href="#" class="dropdown-item delete" id="delete-login-state-btn-widget">删除凭证</a>
                    </div>
                </div>
            `;
        } else if (loginState.exists && !loginState.valid) {
            // 登录失效
            content = `
                <div class="login-status-widget">
                    <span class="status-text status-error" id="update-login-state-btn-widget">! 登录失效 (点击更新)</span>
                </div>
            `;
        } else {
            // 未登录
            content = `
                <div class="login-status-widget">
                    <span class="status-text status-error" id="update-login-state-btn-widget">! 闲鱼未登录 (点击设置)</span>
                </div>
            `;
        }
        container.innerHTML = content;
    }

    function renderNotificationSettings(settings) {
        if (!settings) return '<p>无法加载通知设置。</p>';

        return `
            <form id="notification-settings-form">
                <div class="form-group">
                    <label for="wx-bot-url">🔵 企业微信机器人</label>
                    <input type="text" id="wx-bot-url" name="WX_BOT_URL" value="${settings.WX_BOT_URL || ''}" placeholder="例如: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=your_key">
                    <p class="form-hint">企业微信机器人的 Webhook 地址</p>
                </div>

                <div class="form-group">
                    <label for="dingtalk-bot-url">🔴 钉钉机器人</label>
                    <input type="text" id="dingtalk-bot-url" name="DINGTALK_BOT_URL" value="${settings.DINGTALK_BOT_URL || ''}" placeholder="例如: https://oapi.dingtalk.com/robot/send?access_token=your_token">
                    <p class="form-hint">钉钉群机器人的 Webhook 地址</p>
                </div>

                <div class="form-group">
                    <label for="feishu-bot-url">🟢 飞书机器人</label>
                    <input type="text" id="feishu-bot-url" name="FEISHU_BOT_URL" value="${settings.FEISHU_BOT_URL || ''}" placeholder="例如: https://open.feishu.cn/open-apis/bot/v2/hook/your_token">
                    <p class="form-hint">飞书群机器人的 Webhook 地址</p>
                </div>

                <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 24px 0;">

                <div class="form-group">
                    <label for="webhook-url">🔗 通用 Webhook URL</label>
                    <input type="text" id="webhook-url" name="WEBHOOK_URL" value="${settings.WEBHOOK_URL || ''}" placeholder="例如: https://your-webhook-url.com/endpoint">
                    <p class="form-hint">通用 Webhook 的 URL 地址（自定义通知服务）</p>
                </div>

                <div class="form-group">
                    <label for="webhook-method">Webhook 方法</label>
                    <select id="webhook-method" name="WEBHOOK_METHOD">
                        <option value="POST" ${settings.WEBHOOK_METHOD === 'POST' ? 'selected' : ''}>POST</option>
                        <option value="GET" ${settings.WEBHOOK_METHOD === 'GET' ? 'selected' : ''}>GET</option>
                    </select>
                    <p class="form-hint">Webhook 请求方法</p>
                </div>

                <div class="form-group">
                    <label for="webhook-headers">Webhook 请求头 (JSON)</label>
                    <textarea id="webhook-headers" name="WEBHOOK_HEADERS" rows="2" placeholder='例如: {"Authorization": "Bearer token"}'>${settings.WEBHOOK_HEADERS || ''}</textarea>
                    <p class="form-hint">必须是有效的 JSON 字符串</p>
                </div>

                <div class="form-group">
                    <label for="webhook-content-type">Webhook 内容类型</label>
                    <select id="webhook-content-type" name="WEBHOOK_CONTENT_TYPE">
                        <option value="JSON" ${settings.WEBHOOK_CONTENT_TYPE === 'JSON' ? 'selected' : ''}>JSON</option>
                        <option value="FORM" ${settings.WEBHOOK_CONTENT_TYPE === 'FORM' ? 'selected' : ''}>FORM</option>
                    </select>
                    <p class="form-hint">POST 请求的内容类型</p>
                </div>

                <div class="form-group">
                    <label for="webhook-query-parameters">Webhook 查询参数 (JSON)</label>
                    <textarea id="webhook-query-parameters" name="WEBHOOK_QUERY_PARAMETERS" rows="2" placeholder='例如: {"param1": "value1"}'>${settings.WEBHOOK_QUERY_PARAMETERS || ''}</textarea>
                    <p class="form-hint">GET 请求的查询参数，支持 \${title} 和 \${content} 占位符</p>
                </div>

                <div class="form-group">
                    <label for="webhook-body">Webhook 请求体 (JSON)</label>
                    <textarea id="webhook-body" name="WEBHOOK_BODY" rows="2" placeholder='例如: {"message": "\${content}"}'>${settings.WEBHOOK_BODY || ''}</textarea>
                    <p class="form-hint">POST 请求的请求体，支持 \${title} 和 \${content} 占位符</p>
                </div>

                <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 24px 0;">

                <div class="form-group">
                    <label>
                        <input type="checkbox" id="pcurl-to-mobile" name="PCURL_TO_MOBILE" ${settings.PCURL_TO_MOBILE ? 'checked' : ''}>
                        将电脑版链接转换为手机版
                    </label>
                    <p class="form-hint">在通知中将电脑版商品链接转换为手机版</p>
                </div>

                <div style="margin-top: 24px;">
                    <button type="submit" class="control-button primary-btn">💾 保存通知设置</button>
                </div>
            </form>
        `;
    }

    function renderAISettings(settings) {
        if (!settings) return '<p>无法加载AI设置。</p>';

        return `
            <form id="ai-settings-form">
                <div class="form-group">
                    <label for="openai-api-key">API Key *</label>
                    <input type="password" id="openai-api-key" name="OPENAI_API_KEY" value="${settings.OPENAI_API_KEY || ''}" placeholder="例如: sk-..." required>
                    <p class="form-hint">你的AI模型服务商提供的API Key</p>
                </div>

                <div class="form-group">
                    <label for="openai-base-url">API Base URL *</label>
                    <input type="text" id="openai-base-url" name="OPENAI_BASE_URL" value="${settings.OPENAI_BASE_URL || ''}" placeholder="例如: https://api.openai.com/v1/" required>
                    <p class="form-hint">AI模型的API接口地址，必须兼容OpenAI格式</p>
                </div>

                <div class="form-group">
                    <label for="openai-model-name">模型名称 *</label>
                    <input type="text" id="openai-model-name" name="OPENAI_MODEL_NAME" value="${settings.OPENAI_MODEL_NAME || ''}" placeholder="例如: gemini-2.5-pro" required>
                    <p class="form-hint">你要使用的具体模型名称，必须支持图片分析</p>
                </div>

                <div class="form-group">
                    <label for="proxy-url">代理地址 (可选)</label>
                    <input type="text" id="proxy-url" name="PROXY_URL" value="${settings.PROXY_URL || ''}" placeholder="例如: http://127.0.0.1:7890">
                    <p class="form-hint">HTTP/S代理地址，支持 http 和 socks5 格式</p>
                </div>

                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px;">
                    <button type="button" id="test-ai-settings-btn" class="control-button" style="flex: 1; min-width: 140px;">🔍 测试连接（浏览器）</button>
                    <button type="button" id="test-ai-settings-backend-btn" class="control-button" style="flex: 1; min-width: 140px;">🔧 测试连接（后端）</button>
                    <button type="submit" class="control-button primary-btn" style="flex: 1; min-width: 140px;">💾 保存AI设置</button>
                </div>
            </form>

            <div id="ai-config-status-container" style="margin-top: 24px;"></div>
        `;
    }

    // 新函数：渲染AI配置状态卡片
    function renderAIConfigStatus(status) {
        if (!status) return '';

        const env = status.env_file || {};
        const renderStatusBadge = (isOk, label) => isOk
            ? `<span class="system-status-badge success">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="8" fill="#10B981" opacity="0.2"/>
                    <path d="M5 8L7 10L11 6" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>已配置</span>
               </span>`
            : `<span class="system-status-badge warning">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="8" fill="#F59E0B" opacity="0.2"/>
                    <path d="M8 5V8M8 11V11.01" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>未配置</span>
               </span>`;

        return `
            <div class="system-status-card">
                <div class="system-status-card-header">
                    <div class="system-status-icon ai-config">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M10 4L12 8H16L13 11L14 15L10 13L6 15L7 11L4 8H8L10 4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <h3>AI 模型配置状态</h3>
                </div>
                <div class="system-status-items">
                    <div class="system-status-item">
                        <div class="system-status-item-label">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="item-icon">
                                <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M5 7H11M5 9H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            <span>API Key</span>
                        </div>
                        ${renderStatusBadge(env.openai_api_key_set)}
                    </div>
                    <div class="system-status-item">
                        <div class="system-status-item-label">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="item-icon">
                                <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M8 5V8L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            <span>Base URL</span>
                        </div>
                        ${renderStatusBadge(env.openai_base_url_set)}
                    </div>
                    <div class="system-status-item">
                        <div class="system-status-item-label">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="item-icon">
                                <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M3 6H13M3 10H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            <span>Model Name</span>
                        </div>
                        ${renderStatusBadge(env.openai_model_name_set)}
                    </div>
                    <div class="system-status-item" id="credit-status-item">
                        <div class="system-status-item-label">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="item-icon">
                                <path d="M8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <path d="M8 5V9L11 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span>API额度</span>
                        </div>
                        <span class="system-status-value" id="credit-status">加载中...</span>
                    </div>
                </div>
            </div>
        `;
    }

    function renderCommercialProxySettings(config) {
        if (!config) {
            config = {
                provider: 'kuaidaili',
                kuaidaili_orderid: '',
                extract_num: 50,
                update_interval: 15,
                auto_update: false
            };
        }

        return `
            <div class="settings-card">
                <h3>快代理管理</h3>

                <!-- API配置区域 -->
                <div class="kuaidaili-config" style="margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px;">API配置</h4>
                    <form id="kuaidaili-config-form">
                        <div class="form-group">
                            <label for="kuaidaili-orderid">订单号 *</label>
                            <input type="text" id="kuaidaili-orderid" name="kuaidaili_orderid"
                                   class="form-control"
                                   value="${config.kuaidaili_orderid || ''}"
                                   placeholder="请输入快代理订单号" required>
                            <small class="form-hint">订单类型必须是"私密代理"</small>
                        </div>

                        <div class="form-group">
                            <label for="kuaidaili-secret-id">订单 Secret ID *</label>
                            <input type="text" id="kuaidaili-secret-id" name="kuaidaili_secret_id"
                                   class="form-control"
                                   value="${config.kuaidaili_secret_id || ''}"
                                   placeholder="请输入订单Secret ID" required>
                            <small class="form-hint">⚠️ 订单API密钥（非账户API密钥）- 在快代理控制台订单详情中获取</small>
                        </div>

                        <div class="form-group">
                            <label for="kuaidaili-secret-key">订单 Secret Key *</label>
                            <input type="password" id="kuaidaili-secret-key" name="kuaidaili_secret_key"
                                   class="form-control"
                                   value="${config.kuaidaili_secret_key || ''}"
                                   placeholder="请输入订单Secret Key" required>
                            <small class="form-hint">与Secret ID配对的密钥</small>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div class="form-group">
                                <label for="extract-num">提取数量</label>
                                <input type="number" id="extract-num" name="extract_num"
                                       class="form-control"
                                       value="${config.extract_num || 50}"
                                       min="10" max="200">
                                <small class="form-hint">每次提取的代理数量</small>
                            </div>

                            <div class="form-group">
                                <label for="update-interval">更新频率（分钟）</label>
                                <input type="number" id="update-interval" name="update_interval"
                                       class="form-control"
                                       value="${config.update_interval || 15}"
                                       min="5" max="60">
                                <small class="form-hint">建议15-20分钟</small>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="auto-update" name="auto_update"
                                       ${config.auto_update ? 'checked' : ''}>
                                启用自动更新（推荐）
                            </label>
                            <small class="form-hint">勾选后系统会定时自动提取新代理</small>
                        </div>

                        <div style="display: flex; gap: 10px;">
                            <button type="submit" id="save-config-btn" class="control-button primary-btn">
                                保存配置
                            </button>
                            <button type="button" id="extract-now-btn" class="control-button">
                                立即提取
                            </button>
                        </div>
                    </form>
                </div>

                <!-- 代理列表表格 -->
                <div class="proxy-list-table" style="margin-top: 30px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                        <h4 style="margin: 0;">当前代理池 (<span id="proxy-count">0</span> 个)</h4>
                        <div style="display: flex; gap: 10px;">
                            <button id="refresh-table-btn" class="control-button">刷新</button>
                            <button id="clean-expired-btn" class="control-button">清理过期</button>
                            <button id="extract-refresh-btn" class="control-button">全部刷新</button>
                        </div>
                    </div>

                    <!-- 统计信息 -->
                    <div class="proxy-stats" style="margin-bottom: 15px; padding: 12px; background: #f0f8ff; border-radius: 6px;">
                        <span>总代理: <strong id="stat-total">0</strong></span>
                        <span style="margin-left: 20px;">✓ 可用: <strong id="stat-active">0</strong></span>
                        <span style="margin-left: 20px;">⚠️ 即将过期: <strong id="stat-warning">0</strong></span>
                        <span style="margin-left: 20px;">✗ 过期: <strong id="stat-expired">0</strong></span>
                        <span style="margin-left: 20px;">下次更新: <strong id="next-update">--</strong></span>
                    </div>

                    <!-- 表格 -->
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">代理URL</th>
                                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">状态</th>
                                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">剩余时间</th>
                                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">最后使用</th>
                                <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">操作</th>
                            </tr>
                        </thead>
                        <tbody id="proxy-table-body">
                            <tr>
                                <td colspan="5" style="padding: 20px; text-align: center; color: #999;">
                                    正在加载代理列表...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderAdminSettings(settings) {
        if (!settings) return '<p>无法加载管理员设置。</p>';

        return `
            <form id="admin-settings-form">
                <div class="form-group">
                    <label for="admin-username">管理员用户名</label>
                    <input type="text" id="admin-username" value="${settings.WEB_USERNAME || 'admin'}" readonly
                           style="background-color: #f5f5f5; cursor: not-allowed;">
                    <p class="form-hint">当前管理员账户（不可修改）</p>
                </div>

                <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 24px 0;">

                <div class="form-group">
                    <label for="admin-new-password">新密码</label>
                    <input type="password" id="admin-new-password" name="new_password"
                           placeholder="留空则不修改密码" minlength="6">
                    <p class="form-hint">密码长度至少6位，留空则不修改</p>
                </div>

                <div class="form-group">
                    <label for="admin-confirm-password">确认新密码</label>
                    <input type="password" id="admin-confirm-password" name="confirm_password"
                           placeholder="再次输入新密码" minlength="6">
                    <p class="form-hint">再次输入密码以确认</p>
                </div>

                <div style="margin-top: 24px;">
                    <button type="submit" class="control-button primary-btn">💾 保存密码修改</button>
                </div>
            </form>

            <div style="margin-top: 24px; padding: 16px; background-color: #fff7e6; border: 1px solid #ffd591; border-radius: 8px;">
                <h4 style="margin: 0 0 8px 0; color: #d46b08;">⚠️ 安全提示</h4>
                <ul style="margin: 0; padding-left: 20px; color: #873800;">
                    <li>请定期更换密码以确保系统安全</li>
                    <li>建议使用强密码（包含大小写字母、数字和特殊字符）</li>
                    <li>修改密码后需要重新登录</li>
                </ul>
            </div>
        `;
    }

    function renderLogsManagement(stats) {
        if (!stats) return '<p>无法加载日志信息。</p>';

        const sizeText = stats.total_size_gb >= 1
            ? `${stats.total_size_gb} GB`
            : `${stats.total_size_mb} MB`;

        return `
            <div style="margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 16px;">
                    <div style="padding: 16px; background-color: #f0f5ff; border: 1px solid #91caff; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #0958d9;">${stats.total_files}</div>
                        <div style="font-size: 13px; color: #595959; margin-top: 4px;">日志文件数</div>
                    </div>
                    <div style="padding: 16px; background-color: #f0f5ff; border: 1px solid #91caff; border-radius: 8px; text-align: center;">
                        <div style="font-size: 28px; font-weight: bold; color: #0958d9;">${sizeText}</div>
                        <div style="font-size: 13px; color: #595959; margin-top: 4px;">占用空间</div>
                    </div>
                </div>

                <div style="padding: 12px; background-color: #f6f6f6; border-radius: 6px; font-size: 13px; color: #666;">
                    <div style="margin-bottom: 4px;"><strong>最早日志:</strong> ${stats.oldest_log || '无'}</div>
                    <div><strong>最新日志:</strong> ${stats.newest_log || '无'}</div>
                </div>
            </div>

            <hr style="border: none; border-top: 1px solid #f0f0f0; margin: 20px 0;">

            <div style="margin-bottom: 16px;">
                <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 12px;">
                    <div style="flex: 0 0 auto;">
                        <label for="cleanup-days-select" style="display: block; margin-bottom: 6px; font-weight: 500; color: #333;">保留天数</label>
                        <select id="cleanup-days-select" style="width: 150px; padding: 8px 10px; border: 1px solid #d9d9d9; border-radius: 4px; font-size: 14px;">
                            <option value="1">保留最近 1 天</option>
                            <option value="3" selected>保留最近 3 天</option>
                            <option value="7">保留最近 7 天</option>
                            <option value="14">保留最近 14 天</option>
                            <option value="30">保留最近 30 天</option>
                        </select>
                    </div>
                    <div style="flex: 0 0 auto;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #333;">&nbsp;</label>
                        <button id="cleanup-logs-btn" class="control-button" style="padding: 8px 16px; white-space: nowrap;">🗑️ 清理旧日志</button>
                    </div>
                    <div style="flex: 0 0 auto;">
                        <label style="display: block; margin-bottom: 6px; font-weight: 500; color: #333;">&nbsp;</label>
                        <button id="refresh-logs-stats-btn" class="control-button" style="padding: 8px 16px; white-space: nowrap;">🔄 刷新统计</button>
                    </div>
                </div>
                <p class="form-hint">删除超过指定天数的旧日志文件</p>
            </div>

            <div style="margin-top: 16px; padding: 12px; background-color: #fff7e6; border: 1px solid #ffd591; border-radius: 6px; font-size: 13px; color: #873800;">
                <strong>💡 提示：</strong> 当前日志文件 <code>scraper.log</code> 不会被删除。建议定期清理旧日志以节省磁盘空间。
            </div>
        `;
    }

    // ========== 快代理表格管理函数 ==========

    // 全局变量用于自动更新定时器
    let autoUpdateTimer = null;
    let nextUpdateTime = null;

    // 格式化剩余时间
    function formatRemainingTime(minutes) {
        if (!minutes || minutes < 0) return '未知';
        if (minutes < 5) return `${minutes}分钟`;
        if (minutes < 60) return `${minutes}分钟`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
    }

    // 格式化最后使用时间
    function formatLastUsed(timestamp) {
        if (!timestamp) return '从未使用';
        const now = Date.now();
        const diff = Math.floor((now - timestamp) / 1000); // 秒
        if (diff < 60) return '刚刚';
        if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
        return `${Math.floor(diff / 86400)}天前`;
    }

    // 获取代理状态（基于剩余时间和使用情况）
    function getProxyStatus(proxy) {
        // 简化的状态判断逻辑
        const isActive = proxy.active !== false;
        const failCount = proxy.fail_count || 0;
        const successCount = proxy.success_count || 0;

        if (!isActive || failCount > successCount) {
            return { icon: '✗', text: '过期', class: 'status-expired' };
        }
        return { icon: '✓', text: '可用', class: 'status-active' };
    }

    // 计算剩余时间（简化版本，实际应从快代理API获取）
    function calculateRemainingTime(proxy) {
        // 这里简化处理，返回一个估算值
        // 实际应用中应该根据代理的提取时间来判断
        const totalMinutes = 180; // 假设3小时有效期
        const usedMinutes = Math.floor(Math.random() * totalMinutes);
        return totalMinutes - usedMinutes;
    }

    // 更新统计信息
    function updateProxyStats(proxies) {
        let total = proxies.length;
        let active = 0;
        let warning = 0;
        let expired = 0;

        proxies.forEach(proxy => {
            const status = getProxyStatus(proxy);
            if (status.class === 'status-active') active++;
            else if (status.class === 'status-warning') warning++;
            else expired++;
        });

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-active').textContent = active;
        document.getElementById('stat-warning').textContent = warning;
        document.getElementById('stat-expired').textContent = expired;
        document.getElementById('proxy-count').textContent = total;

        // 更新下次更新时间
        if (nextUpdateTime) {
            const remaining = Math.ceil((nextUpdateTime - Date.now()) / 1000 / 60);
            document.getElementById('next-update').textContent = remaining > 0 ? `${remaining}分钟后` : '即将更新';
        } else {
            document.getElementById('next-update').textContent = '--';
        }
    }

    // 渲染代理表格
    function renderProxyTable(proxies) {
        const tbody = document.getElementById('proxy-table-body');
        if (!tbody) return;

        if (!proxies || proxies.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="padding: 20px; text-align: center; color: #999;">
                        暂无代理，请点击"立即提取"获取代理
                    </td>
                </tr>
            `;
            updateProxyStats([]);
            return;
        }

        const rows = proxies.map((proxy, index) => {
            const status = getProxyStatus(proxy);
            const remainingTime = calculateRemainingTime(proxy);
            const lastUsed = proxy.last_used ? new Date(proxy.last_used).getTime() : null;

            return `
                <tr data-proxy-index="${index}">
                    <td style="padding: 10px; border: 1px solid #ddd; font-family: monospace; font-size: 13px;">
                        ${escapeHtml(proxy.url)}
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                        <span class="${status.class}">${status.icon} ${status.text}</span>
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                        ${formatRemainingTime(remainingTime)}
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center; font-size: 13px;">
                        ${formatLastUsed(lastUsed)}
                    </td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                        <div class="proxy-actions">
                            <button class="control-button test-single-proxy-btn" data-proxy-url="${escapeHtml(proxy.url)}" style="padding: 4px 12px; font-size: 13px;">
                                测试
                            </button>
                            <button class="control-button delete-single-proxy-btn" data-proxy-index="${index}" style="padding: 4px 12px; font-size: 13px; background: #ff4d4f; color: white; border-color: #ff4d4f;">
                                删除
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rows;
        updateProxyStats(proxies);
    }

    // HTML转义函数
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 加载并显示代理列表
    async function loadAndDisplayProxies() {
        try {
            const response = await fetch('/api/settings/proxies');
            const data = await response.json();

            if (data.exists && data.proxies) {
                renderProxyTable(data.proxies);
            } else {
                renderProxyTable([]);
            }
        } catch (error) {
            console.error('加载代理列表失败:', error);
            const tbody = document.getElementById('proxy-table-body');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="padding: 20px; text-align: center; color: #ff4d4f;">
                            加载失败: ${error.message}
                        </td>
                    </tr>
                `;
            }
        }
    }

    // 加载快代理配置
    async function loadKuaidailiConfig() {
        try {
            const response = await fetch('/api/settings/commercial-proxy');
            if (response.ok) {
                const config = await response.json();
                // 填充表单
                if (config.kuaidaili_orderid) {
                    document.getElementById('kuaidaili-orderid').value = config.kuaidaili_orderid;
                }
                if (config.kuaidaili_secret_id) {
                    document.getElementById('kuaidaili-secret-id').value = config.kuaidaili_secret_id;
                }
                if (config.kuaidaili_secret_key) {
                    document.getElementById('kuaidaili-secret-key').value = config.kuaidaili_secret_key;
                }
                if (config.extract_num) {
                    document.getElementById('extract-num').value = config.extract_num;
                }
                if (config.update_interval) {
                    document.getElementById('update-interval').value = config.update_interval;
                }
                if (config.auto_update) {
                    document.getElementById('auto-update').checked = config.auto_update;
                }

                // 如果启用了自动更新，启动定时器
                if (config.auto_update) {
                    startAutoUpdateTimer(config.update_interval || 15);
                }
            }
        } catch (error) {
            console.error('加载快代理配置失败:', error);
        }
    }

    // 保存快代理配置
    async function saveKuaidailiConfig() {
        const form = document.getElementById('kuaidaili-config-form');
        if (!form) return;

        // 验证订单号
        const orderid = document.getElementById('kuaidaili-orderid').value.trim();
        if (!orderid) {
            alert('请输入快代理订单号');
            return;
        }

        // 验证 Secret ID
        const secretId = document.getElementById('kuaidaili-secret-id').value.trim();
        if (!secretId) {
            alert('请输入Secret ID');
            return;
        }

        // 验证 Secret Key
        const secretKey = document.getElementById('kuaidaili-secret-key').value.trim();
        if (!secretKey) {
            alert('请输入Secret Key');
            return;
        }

        const config = {
            provider: 'kuaidaili',
            kuaidaili_orderid: orderid,
            kuaidaili_secret_id: secretId,
            kuaidaili_secret_key: secretKey,
            extract_num: parseInt(document.getElementById('extract-num').value) || 50,
            update_interval: parseInt(document.getElementById('update-interval').value) || 15,
            auto_update: document.getElementById('auto-update').checked
        };

        try {
            const response = await fetch('/api/settings/commercial-proxy', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                const result = await response.json();
                alert(result.message || '配置保存成功！');

                // 更新自动更新定时器
                if (config.auto_update) {
                    startAutoUpdateTimer(config.update_interval);
                } else {
                    stopAutoUpdateTimer();
                }
            } else {
                const error = await response.json();
                alert('保存失败: ' + (error.detail || '未知错误'));
            }
        } catch (error) {
            console.error('保存配置失败:', error);
            alert('保存失败: ' + error.message);
        }
    }

    // 立即提取代理
    async function extractProxiesNow() {
        const btn = document.getElementById('extract-now-btn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = '提取中...';

        try {
            const response = await fetch('/api/settings/commercial-proxy/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();
            if (response.ok) {
                alert(result.message || '代理提取成功！');
                await loadAndDisplayProxies();
            } else {
                alert('提取失败: ' + (result.detail || '未知错误'));
            }
        } catch (error) {
            console.error('提取代理失败:', error);
            alert('提取失败: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    // 刷新表格
    async function refreshProxyTable() {
        await loadAndDisplayProxies();
    }

    // 清理过期代理
    async function cleanExpiredProxies() {
        if (!confirm('确定要清理所有过期和不可用的代理吗？')) return;

        try {
            const response = await fetch('/api/settings/proxies');
            const data = await response.json();

            if (data.exists && data.proxies) {
                const validProxies = data.proxies.filter(proxy => {
                    const status = getProxyStatus(proxy);
                    return status.class === 'status-active';
                });

                await fetch('/api/settings/proxies', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ proxies: validProxies })
                });

                alert(`已清理 ${data.proxies.length - validProxies.length} 个过期代理`);
                await loadAndDisplayProxies();
            }
        } catch (error) {
            console.error('清理代理失败:', error);
            alert('清理失败: ' + error.message);
        }
    }

    // 提取并刷新全部
    async function extractAndRefreshAll() {
        await extractProxiesNow();
    }

    // 启动自动更新定时器
    function startAutoUpdateTimer(intervalMinutes) {
        stopAutoUpdateTimer(); // 先停止旧的定时器

        const intervalMs = intervalMinutes * 60 * 1000;
        nextUpdateTime = Date.now() + intervalMs;

        // 更新显示
        updateNextUpdateTime();

        autoUpdateTimer = setInterval(async () => {
            console.log('自动提取代理...');
            await extractProxiesNow();
            nextUpdateTime = Date.now() + intervalMs;
        }, intervalMs);
    }

    // 停止自动更新定时器
    function stopAutoUpdateTimer() {
        if (autoUpdateTimer) {
            clearInterval(autoUpdateTimer);
            autoUpdateTimer = null;
            nextUpdateTime = null;
            document.getElementById('next-update').textContent = '--';
        }
    }

    // 更新下次更新时间显示
    function updateNextUpdateTime() {
        if (!nextUpdateTime) return;

        const updateDisplay = () => {
            if (!nextUpdateTime) return;
            const remaining = Math.ceil((nextUpdateTime - Date.now()) / 1000 / 60);
            const el = document.getElementById('next-update');
            if (el) {
                el.textContent = remaining > 0 ? `${remaining}分钟后` : '即将更新';
            }
        };

        updateDisplay();
        setInterval(updateDisplay, 60000); // 每分钟更新一次显示
    }

    // 测试单个代理
    async function testSingleProxy(proxyUrl) {
        try {
            const response = await fetch('/api/settings/proxies/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: proxyUrl })
            });

            const result = await response.json();
            if (result.valid) {
                alert('✅ ' + result.message);
            } else {
                alert('❌ ' + result.message);
            }
        } catch (error) {
            alert('测试失败: ' + error.message);
        }
    }

    // 删除单个代理
    async function deleteSingleProxy(proxyIndex) {
        try {
            const response = await fetch('/api/settings/proxies');
            const data = await response.json();

            if (data.exists && data.proxies) {
                const newProxies = data.proxies.filter((_, i) => i !== proxyIndex);

                await fetch('/api/settings/proxies', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ proxies: newProxies })
                });

                await loadAndDisplayProxies();
            }
        } catch (error) {
            console.error('删除代理失败:', error);
            alert('删除失败: ' + error.message);
        }
    }

    async function refreshLoginStatusWidget() {
        const status = await fetchSystemStatus();
        if (status) {
            renderLoginStatusWidget(status);
        }
    }

    function renderSystemStatus(status) {
        if (!status) return '<p>无法加载系统状态。</p>';

        const renderStatusBadge = (isOk, label) => isOk
            ? `<span class="system-status-badge success">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="8" fill="#10B981" opacity="0.2"/>
                    <path d="M5 8L7 10L11 6" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>已配置</span>
               </span>`
            : `<span class="system-status-badge warning">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="8" fill="#F59E0B" opacity="0.2"/>
                    <path d="M8 5V8M8 11V11.01" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <span>未配置</span>
               </span>`;

        const env = status.env_file || {};

        return `
            <div class="system-status-grid">

                <!-- 系统文件卡片 -->
                <div class="system-status-card">
                    <div class="system-status-card-header">
                        <div class="system-status-icon file-config">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M13 3H5C3.89543 3 3 3.89543 3 5V15C3 16.1046 3.89543 17 5 17H15C16.1046 17 17 16.1046 17 15V7L13 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M13 3V7H17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h3>系统文件</h3>
                    </div>
                    <div class="system-status-items">
                        <div class="system-status-item">
                            <div class="system-status-item-label">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="item-icon">
                                    <path d="M2 4C2 2.89543 2.89543 2 4 2H12C13.1046 2 14 2.89543 14 4V12C14 13.1046 13.1046 14 12 14H4C2.89543 14 2 13.1046 2 12V4Z" stroke="currentColor" stroke-width="1.5"/>
                                    <path d="M4 6H10M4 9H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                                <span>环境配置文件</span>
                            </div>
                            ${renderStatusBadge(env.exists)}
                        </div>
                    </div>
                </div>

                <!-- 闲鱼登录状态卡片 -->
                <div class="system-status-card">
                    <div class="system-status-card-header">
                        <div class="system-status-icon login-config">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M10 12C5.02944 12 1 16.0294 1 21H19C19 16.0294 14.9706 12 10 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <h3>闲鱼登录状态</h3>
                    </div>
                    <div class="system-status-items">
                        <div class="system-status-item">
                            <div class="system-status-item-label">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="item-icon">
                                    <path d="M8 8C10.2091 8 12 6.20914 12 4C12 1.79086 10.2091 0 8 0C5.79086 0 4 1.79086 4 4C4 6.20914 5.79086 8 8 8Z" stroke="currentColor" stroke-width="1.5"/>
                                    <path d="M8 9C4.68629 9 2 11.6863 2 15H14C14 11.6863 11.3137 9 8 9Z" stroke="currentColor" stroke-width="1.5"/>
                                </svg>
                                <span>登录状态</span>
                            </div>
                            ${(() => {
                                const login = status.login_state || {};
                                if (!login.exists) {
                                    return `<span class="system-status-badge warning">❌ 未登录</span>`;
                                }
                                if (login.valid) {
                                    return `<span class="system-status-badge success">✅ 已登录</span>`;
                                }
                                return `<span class="system-status-badge warning">⚠️ 登录失效</span>`;
                            })()}
                        </div>
                        <div class="system-status-item">
                            <div class="system-status-item-label">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="item-icon">
                                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                                    <path d="M8 5V8L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                                <span>用户名</span>
                            </div>
                            <span class="system-status-value">${status.login_state?.username || '未知'}</span>
                        </div>
                        <div class="system-status-item">
                            <div class="system-status-item-label">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="item-icon">
                                    <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
                                    <path d="M5 7H11M5 9H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                                <span>Cookie数量</span>
                            </div>
                            <span class="system-status-value">${status.login_state?.cookie_count || 0}</span>
                        </div>
                        ${status.login_state && status.login_state.expired_cookies > 0 ? `
                        <div class="system-status-item">
                            <div class="system-status-item-label">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="item-icon">
                                    <circle cx="8" cy="8" r="6" stroke="#F59E0B" stroke-width="1.5"/>
                                    <path d="M8 5V9M8 11V11.5" stroke="#F59E0B" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                                <span>过期Cookie</span>
                            </div>
                            <span class="system-status-value warning-text">${status.login_state.expired_cookies}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- 通知配置卡片 -->
                <div class="system-status-card">
                    <div class="system-status-card-header">
                        <div class="system-status-icon notification-config">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <path d="M10 3L3 7V13C3 14.1 3.9 15 5 15H15C16.1 15 17 14.1 17 13V7L10 3Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M10 8V12M10 15V15.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <h3>通知渠道配置</h3>
                    </div>
                    <div class="system-status-items">
                        <div class="system-status-item">
                            <div class="system-status-item-label">
                                <span class="notification-icon wechat">🔵</span>
                                <span>企业微信</span>
                            </div>
                            ${renderStatusBadge(env.wx_bot_url_set)}
                        </div>
                        <div class="system-status-item">
                            <div class="system-status-item-label">
                                <span class="notification-icon dingtalk">🔴</span>
                                <span>钉钉</span>
                            </div>
                            ${renderStatusBadge(env.dingtalk_bot_url_set)}
                        </div>
                        <div class="system-status-item">
                            <div class="system-status-item-label">
                                <span class="notification-icon feishu">🟢</span>
                                <span>飞书</span>
                            </div>
                            ${renderStatusBadge(env.feishu_bot_url_set)}
                        </div>
                        <div class="system-status-item">
                            <div class="system-status-item-label">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="item-icon">
                                    <path d="M8 3L3 6V10C3 11.1 3.9 12 5 12H11C12.1 12 13 11.1 13 10V6L8 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M8 7V9M8 11V11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                </svg>
                                <span>通用 Webhook</span>
                            </div>
                            ${renderStatusBadge(env.webhook_url_set)}
                        </div>
                    </div>
                </div>

                <!-- 浏览器配置卡片 -->
                <div class="system-status-card">
                    <div class="system-status-card-header">
                        <div class="system-status-icon browser-config">
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                <rect x="2" y="3" width="16" height="14" rx="2" stroke="currentColor" stroke-width="2"/>
                                <circle cx="6" cy="8" r="1.5" fill="currentColor"/>
                                <circle cx="10" cy="8" r="1.5" fill="currentColor"/>
                                <path d="M14 8L18 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <h3>浏览器配置</h3>
                    </div>
                    <div class="system-status-items">
                        <div class="system-status-item">
                            <div class="system-status-item-label">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="item-icon">
                                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                                    <path d="M8 5V8L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <span>运行模式</span>
                            </div>
                            <div class="browser-mode-switch">
                                <span class="mode-label" id="browser-mode-label">加载中...</span>
                                <label class="mode-toggle">
                                    <input type="checkbox" id="browser-mode-toggle">
                                    <span class="toggle-slider"></span>
                                </label>
                            </div>
                        </div>
                        <div class="system-status-item">
                            <div class="system-status-item-description">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="item-icon">
                                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5"/>
                                    <path d="M8 5V8L10 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                <span>模式说明</span>
                            </div>
                            <div class="browser-mode-description">
                                <div><strong>无头模式</strong>：浏览器在后台运行，不显示窗口，占用资源少</div>
                                <div><strong>有头模式</strong>：浏览器显示窗口，可查看运行过程，方便调试</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        `;
    }

    function renderResultsGrid(data) {
        if (!data || !data.items || data.items.length === 0) {
            return '<p>没有找到符合条件的商品记录。</p>';
        }

        const cards = data.items.map(item => {
            const info = item.商品信息 || {};
            const seller = item.卖家信息 || {};
            const ai = item.ai_analysis || {};

            const isRecommended = ai.is_recommended === true;
            const isNotRecommended = ai.is_recommended === false;
            const recommendationClass = isRecommended ? 'recommended' : (isNotRecommended ? 'not-recommended' : '');
            const recommendationText = isRecommended ? '推荐' : (isNotRecommended ? '不推荐' : '待定');

            const imageUrl = (info.商品图片列表 && info.商品图片列表[0]) ? info.商品图片列表[0] : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
            const crawlTime = item.爬取时间 ? new Date(item.爬取时间).toLocaleString('sv-SE').slice(0, 16) : '未知';
            const publishTime = info.发布时间 || '未知';

            // Escape HTML to prevent XSS
            const escapeHtml = (unsafe) => {
                if (typeof unsafe !== 'string') return unsafe;
                return unsafe
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            };

            return `
            <div class="result-card ${recommendationClass}" data-item='${escapeHtml(JSON.stringify(item))}'>
                <div class="card-image">
                    <a href="${escapeHtml(info.商品链接) || '#'}" target="_blank"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(info.商品标题) || '商品图片'}" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPuWbvueJhzwvdGV4dD48L3N2Zz4=';"></a>
                </div>
                <div class="card-content">
                    <h3 class="card-title"><a href="${escapeHtml(info.商品链接) || '#'}" target="_blank" title="${escapeHtml(info.商品标题) || ''}">${escapeHtml(info.商品标题) || '无标题'}</a></h3>
                    <p class="card-price">${escapeHtml(info.当前售价) || '价格未知'}</p>
                    <div class="card-ai-summary ${isNotRecommended ? 'not-recommended' : ''}">
                        <strong>AI建议: ${escapeHtml(recommendationText)}</strong>
                        <p title="${escapeHtml(ai.reason) || ''}">原因: ${escapeHtml(ai.reason) || '无分析'}</p>
                    </div>
                    <div class="card-footer">
                        <div>
                            <span class="seller-info" title="${escapeHtml(info.卖家昵称) || escapeHtml(seller.卖家昵称) || '未知'}">${escapeHtml(info.卖家昵称) || escapeHtml(seller.卖家昵称) || '未知'}</span>
                            <div class="time-info">
                                <p>${escapeHtml(publishTime)}</p>
                                <p>${escapeHtml(crawlTime)}</p>
                            </div>
                        </div>
                        <a href="${escapeHtml(info.商品链接) || '#'}" target="_blank" class="action-btn">查看详情</a>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        return `<div id="results-grid">${cards}</div>`;
    }

    function renderTasksTable(tasks) {
        if (!tasks || tasks.length === 0) {
            return `
                <div class="tasks-empty-state">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <circle cx="32" cy="32" r="32" fill="#E6F4FF" opacity="0.5"/>
                        <path d="M32 20V32L40 40" stroke="#1677FF" stroke-width="2" stroke-linecap="round"/>
                        <path d="M32 16C23.1634 16 16 23.1634 16 32C16 40.8366 23.1634 48 32 48C40.8366 48 48 40.8366 48 32" stroke="#1677FF" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                    <h3>暂无任务</h3>
                    <p>请点击右上角"创建新任务"来添加第一个任务</p>
                </div>
            `;
        }

        const refreshBtn = '<svg class="icon" viewBox="0 0 1025 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"  width="16" height="16"><path d="M914.17946 324.34283C854.308387 324.325508 750.895846 324.317788 750.895846 324.317788 732.045471 324.317788 716.764213 339.599801 716.764213 358.451121 716.764213 377.30244 732.045471 392.584453 750.895846 392.584453L955.787864 392.584453C993.448095 392.584453 1024 362.040424 1024 324.368908L1024 119.466667C1024 100.615347 1008.718742 85.333333 989.868367 85.333333 971.017993 85.333333 955.736735 100.615347 955.736735 119.466667L955.736735 256.497996C933.314348 217.628194 905.827487 181.795372 873.995034 149.961328 778.623011 54.584531 649.577119 0 511.974435 0 229.218763 0 0 229.230209 0 512 0 794.769791 229.218763 1024 511.974435 1024 794.730125 1024 1023.948888 794.769791 1023.948888 512 1023.948888 493.148681 1008.66763 477.866667 989.817256 477.866667 970.966881 477.866667 955.685623 493.148681 955.685623 512 955.685623 757.067153 757.029358 955.733333 511.974435 955.733333 266.91953 955.733333 68.263265 757.067153 68.263265 512 68.263265 266.932847 266.91953 68.266667 511.974435 68.266667 631.286484 68.266667 743.028524 115.531923 825.725634 198.233152 862.329644 234.839003 892.298522 277.528256 914.17946 324.34283L914.17946 324.34283Z" fill="#389BFF"></path></svg>'

        const stopAllBtn = `
            <div class="tasks-header-actions">
                <button id="stop-all-tasks-btn" class="control-button danger-btn">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor"/>
                    </svg>
                    停止所有任务
                </button>
            </div>
        `;

        const taskCards = tasks.map(task => {
            const isRunning = task.is_running === true;
            const statusBadge = isRunning
                ? `<span class="task-status-badge running">
                    <span class="status-dot"></span>
                    运行中
                   </span>`
                : `<span class="task-status-badge stopped">
                    <span class="status-dot"></span>
                    已停止
                   </span>`;

            const actionButton = isRunning
                ? `<button class="task-action-btn stop-btn" data-task-id="${task.id}" title="停止任务并禁用定时任务">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    停止
                   </button>`
                : `<button class="task-action-btn run-btn" data-task-id="${task.id}" ${!task.enabled ? 'disabled title="任务已禁用"' : ''}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 2L11 7L3 12V2Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                    </svg>
                    运行
                   </button>`;

            return `
            <div class="task-card" data-task-id="${task.id}" data-task='${JSON.stringify(task)}'>
                <!-- 卡片头部 -->
                <div class="task-card-header">
                    <div class="task-card-title">
                        <h3>${task.task_name}</h3>
                        ${statusBadge}
                    </div>
                    <label class="task-switch">
                        <input type="checkbox" data-task-id="${task.id}" ${task.enabled ? 'checked' : ''}>
                        <span class="switch-slider"></span>
                    </label>
                </div>

                <!-- 卡片内容 -->
                <div class="task-card-body">
                    <!-- 关键词 -->
                    <div class="task-info-item">
                        <div class="task-info-label">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M7 2L9 5H5L7 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                                <path d="M2 7H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                                <path d="M7 7V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            <span>关键词</span>
                        </div>
                        <div class="task-info-value">
                            <span class="task-tag">${task.keyword}</span>
                        </div>
                    </div>

                    <!-- 价格范围 -->
                    <div class="task-info-item">
                        <div class="task-info-label">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M7 4V7H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            <span>价格范围</span>
                        </div>
                        <div class="task-info-value">
                            <span class="price-range">${task.min_price || '不限'} - ${task.max_price || '不限'}</span>
                        </div>
                    </div>

                    <!-- 筛选条件 -->
                    <div class="task-info-item">
                        <div class="task-info-label">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2 3H12V5H2V3Z" fill="currentColor"/>
                                <path d="M3 6H11V8H3V6Z" fill="currentColor"/>
                                <path d="M4 9H10V11H4V9Z" fill="currentColor"/>
                            </svg>
                            <span>筛选条件</span>
                        </div>
                        <div class="task-info-value">
                            ${task.personal_only ? '<span class="task-tag personal-tag">🎯 个人闲置</span>' : '<span class="text-muted">无特殊筛选</span>'}
                        </div>
                    </div>

                    <!-- 最大页数 -->
                    <div class="task-info-item">
                        <div class="task-info-label">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M5 6H9M5 8H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            <span>最大页数</span>
                        </div>
                        <div class="task-info-value">
                            <span>${task.max_pages || 3} 页</span>
                        </div>
                    </div>

                    <!-- AI标准 -->
                    <div class="task-info-item">
                        <div class="task-info-label">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M7 2L9 6H13L10 9L11 13L7 11L3 13L4 9L1 6H5L7 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
                            </svg>
                            <span>AI 标准</span>
                        </div>
                        <div class="task-info-value criteria">
                            <button class="refresh-criteria-btn" title="重新生成AI标准" data-task-id="${task.id}">
                                ${refreshBtn}
                            </button>
                            <span class="criteria-file">${(task.ai_prompt_criteria_file || 'N/A').replace('prompts/', '')}</span>
                        </div>
                    </div>

                    <!-- 定时规则 -->
                    <div class="task-info-item">
                        <div class="task-info-label">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.5"/>
                                <path d="M7 4V7L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                            </svg>
                            <span>定时规则</span>
                        </div>
                        <div class="task-info-value cron-info">
                            <div class="cron-expression">${task.cron || '未设置'}</div>
                            ${task.cron ? `<div class="cron-description">${explainCron(task.cron)}</div>` : ''}
                        </div>
                    </div>
                </div>

                <!-- 卡片底部操作 -->
                <div class="task-card-footer">
                    <div class="task-actions">
                        ${actionButton}
                        <button class="task-action-btn edit-btn" data-task-id="${task.id}">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2 11H12M2 11L5 8M2 11L5 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M8 3L11 6M8 3L11 6M8 3L6 5L9 8L11 6L8 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            编辑
                        </button>
                        <button class="task-action-btn delete-btn" data-task-id="${task.id}">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M3 4H11M5 4V3C5 2.44772 5.44772 2 6 2H8C8.55228 2 9 2.44772 9 3V4M5 4V11M9 4V11M5 11H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            删除
                        </button>
                    </div>
                </div>
            </div>`
        }).join('');

        return `${stopAllBtn}<div class="tasks-grid">${taskCards}</div>`;
    }

    // 解释cron表达式为中文
    function explainCron(cronStr) {
        if (!cronStr) return '未设置';

        const parts = cronStr.trim().split(/\s+/);
        if (parts.length !== 5) return '格式错误';

        const [minute, hour, day, month, weekday] = parts;

        // 常用预设匹配
        const presets = {
            '0 */2 * * *': '每2小时',
            '0 */4 * * *': '每4小时',
            '0 */6 * * *': '每6小时',
            '0 */12 * * *': '每12小时',
            '0 0 * * *': '每天0点',
            '0 9 * * *': '每天上午9点',
            '0 18 * * *': '每天下午6点',
            '0 9,18 * * *': '每天上午9点和下午6点',
            '0 9-18/3 * * *': '每天9点到18点每3小时',
            '0 0 * * 1': '每周一早上0点',
        };

        if (presets[cronStr]) {
            return presets[cronStr];
        }

        // 通用解析
        let result = [];

        // 解析分钟
        if (minute === '0') {
            result.push('整点');
        } else if (minute.includes('/')) {
            const interval = minute.split('/')[1];
            result.push(`每${interval}分钟`);
        } else {
            result.push(`${minute}分`);
        }

        // 解析小时
        if (hour === '*') {
            result.push('每小时');
        } else if (hour.includes('*/')) {
            const interval = hour.split('/')[1];
            result.push(`每${interval}小时`);
        } else if (hour.includes(',')) {
            const hours = hour.split(',').join('点、');
            result.push(`${hours}点`);
        } else if (hour.includes('-')) {
            const [start, end] = hour.split('-');
            result.push(`${start}点到${end}点`);
        } else {
            result.push(`${hour}点`);
        }

        // 解析星期
        if (weekday !== '*') {
            const weekdays = {
                '0': '周日',
                '1': '周一',
                '2': '周二',
                '3': '周三',
                '4': '周四',
                '5': '周五',
                '6': '周六',
            };
            result.push(weekdays[weekday] || weekday);
        }

        return result.join(' ');
    }


    async function navigateTo(hash) {
        if (logRefreshInterval) {
            clearInterval(logRefreshInterval);
            logRefreshInterval = null;
        }
        if (taskRefreshInterval) {
            clearInterval(taskRefreshInterval);
            taskRefreshInterval = null;
        }
        const sectionId = hash.substring(1) || 'tasks';

        // Update nav links active state
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${sectionId}`);
        });

        // Update main content
        if (templates[sectionId]) {
            mainContent.innerHTML = templates[sectionId]();
            // Make the new content visible
            const newSection = mainContent.querySelector('.content-section');
            if (newSection) {
                requestAnimationFrame(() => {
                    newSection.classList.add('active');
                });
            }

            // --- Load data for the current section ---
            if (sectionId === 'tasks') {
                const container = document.getElementById('tasks-table-container');
                const refreshTasks = async () => {
                    const tasks = await fetchTasks();
                    // Avoid re-rendering if in edit mode to not lose user input
                    if (container && !container.querySelector('tr.editing')) {
                        container.innerHTML = renderTasksTable(tasks);
                    }
                };
                await refreshTasks();
                taskRefreshInterval = setInterval(refreshTasks, 5000);
            } else if (sectionId === 'results') {
                await initializeResultsView();
            } else if (sectionId === 'logs') {
                await initializeLogsView();
            } else if (sectionId === 'settings') {
                await initializeSettingsView();
            }

        } else {
            mainContent.innerHTML = '<section class="content-section active"><h2>页面未找到</h2></section>';
        }
    }

    async function initializeLogsView() {
        const logContainer = document.getElementById('log-content-container');
        const refreshBtn = document.getElementById('refresh-logs-btn');
        const autoRefreshCheckbox = document.getElementById('auto-refresh-logs-checkbox');
        const clearBtn = document.getElementById('clear-logs-btn');
        let currentLogSize = 0;

        // Function to colorize log content
        const colorizeLog = (logText) => {
            if (!logText) return '';

            // Escape HTML first to prevent XSS
            let escaped = logText
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            // Split into lines
            const lines = escaped.split('\n');

            // Process each line
            return lines.map(line => {
                if (!line.trim()) return '<br>';

                let className = '';
                let processedLine = line;

                // Detect log level and add appropriate class
                if (/ERROR|error|错误/i.test(line)) {
                    className = 'log-line-error';
                } else if (/WARNING|warning|warn|警告/i.test(line)) {
                    className = 'log-line-warning';
                } else if (/SUCCESS|success|成功|completed|完成|started|启动/i.test(line)) {
                    className = 'log-line-success';
                } else if (/DEBUG|debug|调试/i.test(line)) {
                    className = 'log-line-debug';
                } else if (/INFO|info|信息/i.test(line)) {
                    className = 'log-line-info';
                }

                // Highlight timestamps
                processedLine = processedLine.replace(
                    /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/g,
                    '<span class="log-timestamp">$1</span>'
                );

                // Highlight important keywords
                processedLine = processedLine.replace(
                    /(任务|进程|PID|启动|停止|完成|失败|成功)/g,
                    '<strong>$1</strong>'
                );

                return className
                    ? `<div class="${className}">${processedLine}</div>`
                    : `<div>${processedLine}</div>`;
            }).join('');
        };

        const updateLogs = async (isFullRefresh = false) => {
            // For incremental updates, check if user is at the bottom BEFORE adding new content.
            const shouldAutoScroll = isFullRefresh || (logContainer.scrollHeight - logContainer.clientHeight <= logContainer.scrollTop + 5);

            if (isFullRefresh) {
                currentLogSize = 0;
                logContainer.innerHTML = '<div style="color: #5c6370;">正在加载...</div>';
            }

            const logData = await fetchLogs(currentLogSize);

            if (isFullRefresh) {
                // If the log is empty, show a message instead of a blank screen.
                logContainer.innerHTML = colorizeLog(logData.new_content) || '<div style="color: #5c6370;">日志为空，等待内容...</div>';
            } else if (logData.new_content) {
                // If it was showing the empty message, replace it.
                if (logContainer.innerHTML.includes('日志为空，等待内容...')) {
                    logContainer.innerHTML = colorizeLog(logData.new_content);
                } else {
                    logContainer.innerHTML += colorizeLog(logData.new_content);
                }
            }
            currentLogSize = logData.new_pos;

            // Scroll to bottom if it was a full refresh or if the user was already at the bottom.
            if (shouldAutoScroll) {
                logContainer.scrollTop = logContainer.scrollHeight;
            }
        };

        refreshBtn.addEventListener('click', () => updateLogs(true));

        clearBtn.addEventListener('click', async () => {
            if (confirm('你确定要清空所有运行日志吗？此操作不可恢复。')) {
                const result = await clearLogs();
                if (result) {
                    await updateLogs(true);
                    alert('日志已清空。');
                }
            }
        });

        autoRefreshCheckbox.addEventListener('change', () => {
            if (autoRefreshCheckbox.checked) {
                if (logRefreshInterval) clearInterval(logRefreshInterval);
                logRefreshInterval = setInterval(() => updateLogs(false), 1000);
            } else {
                if (logRefreshInterval) {
                    clearInterval(logRefreshInterval);
                    logRefreshInterval = null;
                }
            }
        });

        await updateLogs(true);
        autoRefreshCheckbox.click(); // Enable auto-refresh by default
    }

    async function fetchAndRenderResults() {
        const selector = document.getElementById('result-file-selector');
        const checkbox = document.getElementById('recommended-only-checkbox');
        const sortBySelector = document.getElementById('sort-by-selector');
        const sortOrderSelector = document.getElementById('sort-order-selector');
        const searchInput = document.getElementById('search-input');
        const container = document.getElementById('results-grid-container');

        if (!selector || !checkbox || !container || !sortBySelector || !sortOrderSelector) return;

        const selectedFile = selector.value;
        const recommendedOnly = checkbox.checked;
        const sortBy = sortBySelector.value;
        const sortOrder = sortOrderSelector.value;
        const searchText = searchInput ? searchInput.value.toLowerCase() : '';

        if (!selectedFile) {
            container.innerHTML = '<p>请先选择一个结果文件。</p>';
            return;
        }

        localStorage.setItem('lastSelectedResultFile', selectedFile);

        container.innerHTML = '<p>正在加载结果...</p>';

        // Fetch all data without limit for statistics
        const allData = await fetchResultContent(selectedFile, false, sortBy, sortOrder, 10000);

        // Update statistics with all data
        updateStatistics(allData);

        // Apply recommended_only filter if checked
        let displayData = allData;
        if (recommendedOnly) {
            displayData = await fetchResultContent(selectedFile, true, sortBy, sortOrder, 10000);
        }

        // Filter by search text if provided
        if (searchText && displayData.items) {
            displayData = {
                ...displayData,
                items: displayData.items.filter(item => {
                    const info = item.商品信息 || {};
                    const seller = item.卖家信息 || {};
                    const title = (info.商品标题 || '').toLowerCase();
                    const sellerName = (info.卖家昵称 || seller.卖家昵称 || '').toLowerCase();
                    return title.includes(searchText) || sellerName.includes(searchText);
                })
            };
        }

        container.innerHTML = renderResultsGrid(displayData);
    }

    function updateStatistics(data) {
        if (!data || !data.items) return;

        const statsContainer = document.getElementById('results-stats');
        const totalEl = document.getElementById('stat-total');
        const recommendedEl = document.getElementById('stat-recommended');
        const notRecommendedEl = document.getElementById('stat-not-recommended');

        let recommended = 0;
        let notRecommended = 0;

        data.items.forEach(item => {
            const ai = item.ai_analysis || {};

            // Check different possible value types
            if (ai.is_recommended === true || ai.is_recommended === 'true' || ai.is_recommended === 1) {
                recommended++;
            } else if (ai.is_recommended === false || ai.is_recommended === 'false' || ai.is_recommended === 0) {
                notRecommended++;
            }
        });

        totalEl.textContent = data.items.length;
        recommendedEl.textContent = recommended;
        notRecommendedEl.textContent = notRecommended;

        statsContainer.style.display = 'grid';
    }

    async function initializeResultsView() {
        const selector = document.getElementById('result-file-selector');
        const checkbox = document.getElementById('recommended-only-checkbox');
        const refreshBtn = document.getElementById('refresh-results-btn');
        const deleteBtn = document.getElementById('delete-results-btn');
        const sortBySelector = document.getElementById('sort-by-selector');
        const sortOrderSelector = document.getElementById('sort-order-selector');
        const searchInput = document.getElementById('search-input');

        const fileData = await fetchResultFiles();
        if (fileData && fileData.files && fileData.files.length > 0) {
            const lastSelectedFile = localStorage.getItem('lastSelectedResultFile');
            // Determine the file to select. Default to the first file if nothing is stored or if the stored file no longer exists.
            let fileToSelect = fileData.files[0];
            if (lastSelectedFile && fileData.files.includes(lastSelectedFile)) {
                fileToSelect = lastSelectedFile;
            }

            selector.innerHTML = fileData.files.map(f =>
                `<option value="${f}" ${f === fileToSelect ? 'selected' : ''}>${f}</option>`
            ).join('');

            // The selector's value is now correctly set by the 'selected' attribute.
            // We can proceed with adding listeners and the initial fetch.

            selector.addEventListener('change', fetchAndRenderResults);
            checkbox.addEventListener('change', fetchAndRenderResults);
            sortBySelector.addEventListener('change', fetchAndRenderResults);
            sortOrderSelector.addEventListener('change', fetchAndRenderResults);
            refreshBtn.addEventListener('click', fetchAndRenderResults);

            // Add search input listener with debounce
            if (searchInput) {
                let searchTimeout;
                searchInput.addEventListener('input', () => {
                    clearTimeout(searchTimeout);
                    searchTimeout = setTimeout(fetchAndRenderResults, 300);
                });
            }

            // Enable delete button when a file is selected
            const updateDeleteButtonState = () => {
                deleteBtn.disabled = !selector.value;
            };
            selector.addEventListener('change', updateDeleteButtonState);
            // 初始化时也更新一次删除按钮状态
            updateDeleteButtonState();

            // Delete button functionality - 移除旧的事件监听器避免重复绑定
            const newDeleteBtn = deleteBtn.cloneNode(true);
            deleteBtn.parentNode.replaceChild(newDeleteBtn, deleteBtn);

            newDeleteBtn.addEventListener('click', async () => {
                const selectedFile = selector.value;
                if (!selectedFile) {
                    alert('请先选择一个结果文件。');
                    return;
                }

                if (confirm(`你确定要删除结果文件 "${selectedFile}" 吗？此操作不可恢复。`)) {
                    const result = await deleteResultFile(selectedFile);
                    if (result) {
                        alert(result.message);
                        // Refresh the file list
                        await initializeResultsView();
                    }
                }
            });

            // Initial load
            await fetchAndRenderResults();
        } else {
            selector.innerHTML = '<option value="">没有可用的结果文件</option>';
            document.getElementById('results-grid-container').innerHTML = '<p>没有找到任何结果文件。请先运行监控任务。</p>';
        }
    }

    async function initializeSettingsView() {
        // 1. Render System Status
        const statusContainer = document.getElementById('system-status-container');
        const status = await fetchSystemStatus();
        statusContainer.innerHTML = renderSystemStatus(status);

        // Initialize browser mode toggle
        await initializeBrowserMode();

        // 2. Render Notification Settings
        const notificationContainer = document.getElementById('notification-settings-container');
        const notificationSettings = await fetchNotificationSettings();
        if (notificationSettings !== null) {
            notificationContainer.innerHTML = renderNotificationSettings(notificationSettings);
        } else {
            notificationContainer.innerHTML = '<p>加载通知配置失败。请检查服务器是否正常运行。</p>';
        }

        // 3. Render AI Settings
        const aiSettingsContainer = document.getElementById('ai-settings-container');
        const aiSettings = await fetchAISettings();
        if (aiSettings !== null) {
            aiSettingsContainer.innerHTML = renderAISettings(aiSettings);

            // 渲染AI配置状态卡片
            const aiConfigStatusContainer = document.getElementById('ai-config-status-container');
            if (aiConfigStatusContainer && status) {
                aiConfigStatusContainer.innerHTML = renderAIConfigStatus(status);
                // 重新加载额度信息（因为元素已经插入DOM）
                await loadOpenAICredit();
            }
        } else {
            aiSettingsContainer.innerHTML = '<p>加载AI配置失败。请检查服务器是否正常运行。</p>';
        }

        // ========================================================================
        // [已移除 - 2025-12-29] 代理池UI初始化代码
        // 原功能：渲染代理池配置界面、绑定事件监听器、设置自动刷新
        // 移除原因：代理池功能不好用，后续重新规划
        // ========================================================================

        // 4. Setup Prompt Editor
        const promptSelector = document.getElementById('prompt-selector');
        const promptEditor = document.getElementById('prompt-editor');
        const savePromptBtn = document.getElementById('save-prompt-btn');

        const prompts = await fetchPrompts();
        if (prompts && prompts.length > 0) {
            promptSelector.innerHTML = '<option value="">-- 请选择 --</option>' + prompts.map(p => `<option value="${p}">${p}</option>`).join('');
        } else if (prompts && prompts.length === 0) {
            promptSelector.innerHTML = '<option value="">没有找到Prompt文件</option>';
        } else {
            // prompts is null or undefined, which means fetch failed
            promptSelector.innerHTML = '<option value="">加载Prompt文件列表失败</option>';
        }

        promptSelector.addEventListener('change', async () => {
            const selectedFile = promptSelector.value;
            if (selectedFile) {
                promptEditor.value = "正在加载...";
                promptEditor.disabled = true;
                savePromptBtn.disabled = true;
                const data = await fetchPromptContent(selectedFile);
                if (data) {
                    promptEditor.value = data.content;
                    promptEditor.disabled = false;
                    savePromptBtn.disabled = false;
                } else {
                    promptEditor.value = `加载文件 ${selectedFile} 失败。`;
                }
            } else {
                promptEditor.value = "请先从上方选择一个 Prompt 文件进行编辑...";
                promptEditor.disabled = true;
                savePromptBtn.disabled = true;
            }
        });

        savePromptBtn.addEventListener('click', async () => {
            const selectedFile = promptSelector.value;
            const content = promptEditor.value;
            if (!selectedFile) {
                alert("请先选择一个要保存的Prompt文件。");
                return;
            }

            savePromptBtn.disabled = true;
            savePromptBtn.textContent = '保存中...';

            const result = await updatePrompt(selectedFile, content);
            if (result) {
                alert(result.message || "保存成功！");
            }
            // No need to show alert on failure, as updatePrompt already does.

            savePromptBtn.disabled = false;
            savePromptBtn.textContent = '保存更改';
        });

        // 7. Add event listener for notification settings form
        const notificationForm = document.getElementById('notification-settings-form');
        if (notificationForm) {
            notificationForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Collect form data
                const formData = new FormData(notificationForm);
                const settings = {};

                // Handle regular inputs
                for (let [key, value] of formData.entries()) {
                    if (key === 'PCURL_TO_MOBILE') {
                        settings[key] = value === 'on';
                    } else {
                        settings[key] = value || '';
                    }
                }

                // Handle unchecked checkboxes (they don't appear in FormData)
                const pcurlCheckbox = document.getElementById('pcurl-to-mobile');
                if (pcurlCheckbox && !pcurlCheckbox.checked) {
                    settings.PCURL_TO_MOBILE = false;
                }

                // Save settings
                const saveBtn = notificationForm.querySelector('button[type="submit"]');
                const originalText = saveBtn.textContent;
                saveBtn.disabled = true;
                saveBtn.textContent = '保存中...';

                const result = await updateNotificationSettings(settings);
                if (result) {
                    alert(result.message || "通知设置已保存！");
                }

                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            });
        }

        // 8. Add event listener for AI settings form
        const aiForm = document.getElementById('ai-settings-form');
        if (aiForm) {
            aiForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Collect form data
                const formData = new FormData(aiForm);
                const settings = {};

                // Handle regular inputs
                for (let [key, value] of formData.entries()) {
                    settings[key] = value || '';
                }

                // Save settings
                const saveBtn = aiForm.querySelector('button[type="submit"]');
                const originalText = saveBtn.textContent;
                saveBtn.disabled = true;
                saveBtn.textContent = '保存中...';

                const result = await updateAISettings(settings);
                if (result) {
                    alert(result.message || "AI设置已保存！");
                }

                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            });

            // Add event listener for AI settings test button (browser)
            const testBtn = document.getElementById('test-ai-settings-btn');
            if (testBtn) {
                testBtn.addEventListener('click', async () => {
                    // Collect form data
                    const formData = new FormData(aiForm);
                    const settings = {};

                    // Handle regular inputs
                    for (let [key, value] of formData.entries()) {
                        settings[key] = value || '';
                    }

                    // Test settings
                    const originalText = testBtn.textContent;
                    testBtn.disabled = true;
                    testBtn.textContent = '测试中...';

                    const result = await testAISettings(settings);
                    if (result) {
                        if (result.success) {
                            alert(result.message || "AI模型连接测试成功！");
                        } else {
                            alert("浏览器测试失败: " + result.message);
                        }
                    }

                    testBtn.disabled = false;
                    testBtn.textContent = originalText;
                });
            }

            // Add event listener for AI settings test button (backend)
            const testBackendBtn = document.getElementById('test-ai-settings-backend-btn');
            if (testBackendBtn) {
                testBackendBtn.addEventListener('click', async () => {
                    // Test backend settings without form data (uses env config)
                    const originalText = testBackendBtn.textContent;
                    testBackendBtn.disabled = true;
                    testBackendBtn.textContent = '测试中...';

                    try {
                        const response = await fetch('/api/settings/ai/test/backend', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        });

                        if (!response.ok) {
                            throw new Error('后端测试请求失败');
                        }

                        const result = await response.json();
                        if (result.success) {
                            alert(result.message || "后端AI模型连接测试成功！");
                        } else {
                            alert("后端容器测试失败: " + result.message);
                        }
                    } catch (error) {
                        alert("后端容器测试错误: " + error.message);
                    }

                    testBackendBtn.disabled = false;
                    testBackendBtn.textContent = originalText;
                });
            }
        }

        // 9. Render Admin Settings
        const adminContainer = document.getElementById('admin-settings-container');
        if (adminContainer) {
            // Use system status to get admin username
            const adminSettings = {
                WEB_USERNAME: status?.env_file?.WEB_USERNAME || 'admin'
            };
            adminContainer.innerHTML = renderAdminSettings(adminSettings);

            // Add event listener for admin settings form
            const adminForm = document.getElementById('admin-settings-form');
            if (adminForm) {
                adminForm.addEventListener('submit', async (e) => {
                    e.preventDefault();

                    const newPassword = document.getElementById('admin-new-password').value;
                    const confirmPassword = document.getElementById('admin-confirm-password').value;

                    // Validation
                    if (newPassword && newPassword.length < 6) {
                        alert('密码长度至少需要6位');
                        return;
                    }

                    if (newPassword && newPassword !== confirmPassword) {
                        alert('两次输入的密码不一致');
                        return;
                    }

                    if (!newPassword) {
                        alert('请输入新密码，或留空不修改');
                        return;
                    }

                    // Confirm password change
                    if (!confirm('确定要修改管理员密码吗？修改后需要重新登录。')) {
                        return;
                    }

                    const saveBtn = adminForm.querySelector('button[type="submit"]');
                    const originalText = saveBtn.textContent;
                    saveBtn.disabled = true;
                    saveBtn.textContent = '保存中...';

                    try {
                        const response = await fetch('/api/admin/change-password', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ new_password: newPassword })
                        });

                        if (response.ok) {
                            const result = await response.json();

                            console.log('[密码修改] 服务器响应:', result);

                            // Clear form
                            document.getElementById('admin-new-password').value = '';
                            document.getElementById('admin-confirm-password').value = '';

                            // Show success message
                            alert(result.message || '密码修改成功！请重新登录。');

                            console.log('[密码修改] 准备跳转到登录页...');

                            // Redirect to login page (session already cleared by backend)
                            setTimeout(() => {
                                console.log('[密码修改] 执行跳转...');
                                window.location.href = '/login';
                            }, 500);
                        } else {
                            const error = await response.json();
                            alert('密码修改失败: ' + (error.detail || '未知错误'));
                        }
                    } catch (error) {
                        alert('密码修改错误: ' + error.message);
                    }

                    saveBtn.disabled = false;
                    saveBtn.textContent = originalText;
                });
            }
        }

        // 8. Initialize Logs Management
        const logsContainer = document.getElementById('logs-management-container');
        if (logsContainer) {
            try {
                // Fetch logs statistics
                const statsResponse = await fetch('/api/logs/stats');
                if (statsResponse.ok) {
                    const stats = await statsResponse.json();
                    logsContainer.innerHTML = renderLogsManagement(stats);

                    // Add event listener for cleanup button
                    const cleanupBtn = document.getElementById('cleanup-logs-btn');
                    const daysSelect = document.getElementById('cleanup-days-select');
                    const refreshLogsBtn = document.getElementById('refresh-logs-stats-btn');

                    if (cleanupBtn && daysSelect) {
                        cleanupBtn.addEventListener('click', async () => {
                            const days = parseInt(daysSelect.value);

                            if (!confirm(`确定要删除超过 ${days} 天的旧日志吗？此操作不可恢复。`)) {
                                return;
                            }

                            cleanupBtn.disabled = true;
                            cleanupBtn.textContent = '清理中...';

                            try {
                                const response = await fetch(`/api/logs/cleanup-old?days=${days}`, {
                                    method: 'POST'
                                });

                                if (response.ok) {
                                    const result = await response.json();
                                    alert(result.message || '清理完成！');

                                    // Refresh logs statistics
                                    await initializeLogsManagement();
                                } else {
                                    const error = await response.json();
                                    alert('清理失败: ' + (error.detail || '未知错误'));
                                }
                            } catch (error) {
                                alert('清理错误: ' + error.message);
                            }

                            cleanupBtn.disabled = false;
                            cleanupBtn.textContent = '🗑️ 清理旧日志';
                        });
                    }

                    if (refreshLogsBtn) {
                        refreshLogsBtn.addEventListener('click', async () => {
                            refreshLogsBtn.disabled = true;
                            refreshLogsBtn.textContent = '刷新中...';
                            await initializeLogsManagement();
                            refreshLogsBtn.disabled = false;
                            refreshLogsBtn.textContent = '🔄 刷新';
                        });
                    }
                } else {
                    logsContainer.innerHTML = '<p>加载日志信息失败。请检查服务器是否正常运行。</p>';
                }
            } catch (error) {
                console.error('Failed to load logs management:', error);
                logsContainer.innerHTML = '<p>加载日志信息时出错。</p>';
            }
        }
    }

    async function initializeLogsManagement() {
        const logsContainer = document.getElementById('logs-management-container');
        if (logsContainer) {
            const statsResponse = await fetch('/api/logs/stats');
            if (statsResponse.ok) {
                const stats = await statsResponse.json();
                logsContainer.innerHTML = renderLogsManagement(stats);

                // Reattach event listeners
                const cleanupBtn = document.getElementById('cleanup-logs-btn');
                const daysSelect = document.getElementById('cleanup-days-select');
                const refreshLogsBtn = document.getElementById('refresh-logs-stats-btn');

                if (cleanupBtn && daysSelect) {
                    cleanupBtn.onclick = async () => {
                        const days = parseInt(daysSelect.value);

                        if (!confirm(`确定要删除超过 ${days} 天的旧日志吗？此操作不可恢复。`)) {
                            return;
                        }

                        cleanupBtn.disabled = true;
                        cleanupBtn.textContent = '清理中...';

                        try {
                            const response = await fetch(`/api/logs/cleanup-old?days=${days}`, {
                                method: 'POST'
                            });

                            if (response.ok) {
                                const result = await response.json();
                                alert(result.message || '清理完成！');
                                await initializeLogsManagement();
                            } else {
                                const error = await response.json();
                                alert('清理失败: ' + (error.detail || '未知错误'));
                            }
                        } catch (error) {
                            alert('清理错误: ' + error.message);
                        }

                        cleanupBtn.disabled = false;
                        cleanupBtn.textContent = '🗑️ 清理旧日志';
                    };
                }

                if (refreshLogsBtn) {
                    refreshLogsBtn.onclick = async () => {
                        refreshLogsBtn.disabled = true;
                        refreshLogsBtn.textContent = '刷新中...';
                        await initializeLogsManagement();
                        refreshLogsBtn.disabled = false;
                        refreshLogsBtn.textContent = '🔄 刷新';
                    };
                }
            }
        }
    }

    // Handle navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const hash = this.getAttribute('href');
            if (window.location.hash !== hash) {
                window.location.hash = hash;
            }
        });
    });

    // Handle hash changes (e.g., back/forward buttons, direct URL)
    window.addEventListener('hashchange', () => {
        navigateTo(window.location.hash);
    });

    // --- Event Delegation for dynamic content ---
    mainContent.addEventListener('click', async (event) => {
        const target = event.target;
        const button = target.closest('button'); // Find the closest button element
        if (!button) return;

        // Support both old table layout (tr) and new card layout (.task-card)
        const row = button.closest('tr');
        const card = button.closest('.task-card');
        const taskId = button.dataset.taskId || (row ? row.dataset.taskId : null) || (card ? card.dataset.taskId : null);

        if (button.matches('.view-json-btn')) {
            const card = button.closest('.result-card');
            const itemData = JSON.parse(card.dataset.item);
            const jsonContent = document.getElementById('json-viewer-content');
            jsonContent.textContent = JSON.stringify(itemData, null, 2);

            const modal = document.getElementById('json-viewer-modal');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('visible'), 10);
        } else if (button.matches('.run-task-btn') || (button.matches('.task-action-btn') && button.matches('.run-btn'))) {
            const taskId = button.dataset.taskId;
            button.disabled = true;
            button.innerHTML = `
                <svg class="spin" width="14" height="14" viewBox="0 0 14 14" fill="none" style="animation: spin 1s linear infinite;">
                    <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="2" stroke-dasharray="31.4 31.4"/>
                </svg>
                启动中...
            `;
            await startSingleTask(taskId);
            // The auto-refresh will update the UI. For immediate feedback:
            const tasks = await fetchTasks();
            document.getElementById('tasks-table-container').innerHTML = renderTasksTable(tasks);
        } else if (button.matches('.stop-task-btn') || (button.matches('.task-action-btn') && button.matches('.stop-btn'))) {
            const taskId = button.dataset.taskId;
            button.disabled = true;
            button.innerHTML = `
                <svg class="spin" width="14" height="14" viewBox="0 0 14 14" fill="none" style="animation: spin 1s linear infinite;">
                    <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="2" stroke-dasharray="31.4 31.4"/>
                </svg>
                停止中...
            `;
            const result = await stopSingleTask(taskId);
            if (result && result.message) {
                // 显示友好的成功提示
                console.log(result.message);
            }
            // The auto-refresh will update the UI. For immediate feedback:
            const tasks = await fetchTasks();
            document.getElementById('tasks-table-container').innerHTML = renderTasksTable(tasks);
        } else if (button.matches('#stop-all-tasks-btn')) {
            // 确认对话框
            const confirmed = confirm('确定要停止所有正在运行的任务吗？这将同时禁用所有定时任务。');
            if (!confirmed) return;

            button.disabled = true;
            button.textContent = '⏳ 停止中...';
            const result = await stopAllTasks();
            // The auto-refresh will update the UI. For immediate feedback:
            const tasks = await fetchTasks();
            document.getElementById('tasks-table-container').innerHTML = renderTasksTable(tasks);
        } else if (button.matches('.edit-btn')) {
            // Support both old table and new card layout
            const taskData = row ? JSON.parse(row.dataset.task) : (card ? JSON.parse(card.dataset.task) : null);

            if (!taskData) {
                alert('无法获取任务数据');
                return;
            }

            // For both card and table layout, use the edit modal
            const modal = document.getElementById('edit-task-modal');
            const taskIdInput = document.getElementById('edit-task-id');
            const taskNameInput = document.getElementById('edit-task-name');
            const keywordInput = document.getElementById('edit-keyword');
            const minPriceInput = document.getElementById('edit-min-price');
            const maxPriceInput = document.getElementById('edit-max-price');
            const personalOnlyInput = document.getElementById('edit-personal-only');
            const maxPagesInput = document.getElementById('edit-max-pages');
            const cronPresetSelect = document.getElementById('edit-cron-preset');
            const cronInput = document.getElementById('edit-cron');

            // Fill form with task data
            taskIdInput.value = taskId;
            taskNameInput.value = taskData.task_name || '';
            keywordInput.value = taskData.keyword || '';
            minPriceInput.value = taskData.min_price || '';
            maxPriceInput.value = taskData.max_price || '';
            personalOnlyInput.checked = taskData.personal_only || false;
            maxPagesInput.value = taskData.max_pages || 3;
            cronInput.value = taskData.cron || '';

            // Set cron preset
            if (taskData.cron) {
                const matchingOption = Array.from(cronPresetSelect.options).find(opt => opt.value === taskData.cron);
                if (matchingOption) {
                    cronPresetSelect.value = taskData.cron;
                } else {
                    cronPresetSelect.value = 'custom';
                }
            } else {
                cronPresetSelect.value = '';
            }

            // Show modal
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('visible'), 10);

            // For old table layout, keep the original behavior as fallback
            if (row && !card) {
                const isRunning = taskData.is_running === true;
                const statusBadge = isRunning
                    ? `<span class="status-badge status-running">运行中</span>`
                    : `<span class="status-badge status-stopped">已停止</span>`;

                row.classList.add('editing');
                row.innerHTML = `
                    <td>
                        <label class="switch">
                            <input type="checkbox" ${taskData.enabled ? 'checked' : ''} data-field="enabled">
                            <span class="slider round"></span>
                        </label>
                    </td>
                    <td><input type="text" value="${taskData.task_name}" data-field="task_name"></td>
                    <td>${statusBadge}</td>
                    <td><input type="text" value="${taskData.keyword}" data-field="keyword"></td>
                    <td>
                        <input type="text" value="${taskData.min_price || ''}" placeholder="不限" data-field="min_price" style="width: 60px;"> -
                        <input type="text" value="${taskData.max_price || ''}" placeholder="不限" data-field="max_price" style="width: 60px;">
                    </td>
                    <td>
                        <label>
                            <input type="checkbox" ${taskData.personal_only ? 'checked' : ''} data-field="personal_only"> 个人闲置
                        </label>
                    </td>
                    <td><input type="number" value="${taskData.max_pages || 3}" data-field="max_pages" style="width: 60px;" min="1"></td>
                    <td>${(taskData.ai_prompt_criteria_file || 'N/A').replace('prompts/', '')}</td>
                    <td>
                        <div style="display: flex; flex-direction: column; gap: 5px;">
                            <select class="cron-preset-select" style="width: 100%; padding: 4px;">
                                <option value="">-- 选择常用时间 --</option>
                                <option value="0 */2 * * *">每2小时</option>
                                <option value="0 */4 * * *">每4小时</option>
                                <option value="0 */6 * * *">每6小时</option>
                                <option value="0 */12 * * *">每12小时</option>
                                <option value="0 0 * * *">每天0点</option>
                                <option value="0 9 * * *">每天上午9点</option>
                                <option value="0 18 * * *">每天下午6点</option>
                                <option value="0 9,18 * * *">每天上午9点和下午6点</option>
                                <option value="0 9-18/3 * * *">每天9点到18点，每3小时</option>
                                <option value="0 0 * * 1">每周一早上0点</option>
                                <option value="custom">自定义...</option>
                            </select>
                            <input type="text" value="${taskData.cron || ''}" placeholder="留空则不使用定时" data-field="cron" style="width: 100%; padding: 4px; font-family: monospace;">
                            <small style="color: #666; font-size: 11px;">格式: 分 时 日 月 周</small>
                        </div>
                    </td>
                    <td>
                        <button class="action-btn save-btn">保存</button>
                        <button class="action-btn cancel-btn">取消</button>
                    </td>
                `;

                // 添加cron预设下拉框的事件监听
                const cronPresetSelect = row.querySelector('.cron-preset-select');
                const cronInputRow = row.querySelector('input[data-field="cron"]');
                if (cronPresetSelect && cronInputRow) {
                    cronPresetSelect.addEventListener('change', function() {
                        if (this.value && this.value !== 'custom') {
                            cronInputRow.value = this.value;
                        }
                    });

                    // 如果当前有cron值，尝试匹配预设
                    if (taskData.cron) {
                        const matchingOption = Array.from(cronPresetSelect.options).find(opt => opt.value === taskData.cron);
                        if (matchingOption) {
                            cronPresetSelect.value = taskData.cron;
                        } else {
                            cronPresetSelect.value = 'custom';
                        }
                    }
                }
            }
        } else if (button.matches('.delete-btn')) {
            // Support both old table and new card layout
            const taskData = row ? null : (card ? JSON.parse(card.dataset.task) : null);
            const taskName = row ? row.querySelector('td:nth-child(2)').textContent : (taskData ? taskData.task_name : '未知');

            if (confirm(`你确定要删除任务 "${taskName}" 吗?`)) {
                const result = await deleteTask(taskId);
                if (result) {
                    if (row) {
                        row.remove();
                    } else if (card) {
                        card.remove();
                    }
                }
            }
        } else if (button.matches('#add-task-btn')) {
            const modal = document.getElementById('add-task-modal');
            modal.style.display = 'flex';
            // Use a short timeout to allow the display property to apply before adding the transition class
            setTimeout(() => modal.classList.add('visible'), 10);
        } else if (button.matches('.save-btn')) {
            const taskNameInput = row.querySelector('input[data-field="task_name"]');
            const keywordInput = row.querySelector('input[data-field="keyword"]');
            if (!taskNameInput.value.trim() || !keywordInput.value.trim()) {
                alert('任务名称和关键词不能为空。');
                return;
            }

            const inputs = row.querySelectorAll('input[data-field]');
            const updatedData = {};
            inputs.forEach(input => {
                const field = input.dataset.field;
                if (input.type === 'checkbox') {
                    updatedData[field] = input.checked;
                } else {
                    const value = input.value.trim();
                    if (field === 'max_pages') {
                        // 确保 max_pages 作为数字发送，如果为空则默认为3
                        updatedData[field] = value ? parseInt(value, 10) : 3;
                    } else {
                        updatedData[field] = value === '' ? null : value;
                    }
                }
            });

            const result = await updateTask(taskId, updatedData);
            if (result && result.task) {
                const container = document.getElementById('tasks-table-container');
                const tasks = await fetchTasks();
                container.innerHTML = renderTasksTable(tasks);
            }
        } else if (button.matches('.cancel-btn')) {
            const container = document.getElementById('tasks-table-container');
            const tasks = await fetchTasks();
            container.innerHTML = renderTasksTable(tasks);
        } else if (button.matches('.refresh-criteria') || button.matches('.refresh-criteria-btn')) {
            // Support both old and new button class names
            const taskData = row ? JSON.parse(row.dataset.task) : (card ? JSON.parse(card.dataset.task) : null);
            const modal = document.getElementById('refresh-criteria-modal');
            const textarea = document.getElementById('refresh-criteria-description');
            textarea.value = taskData['description'] || '';
            modal.dataset.taskId = taskId;
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('visible'), 10);
        }
    });

    mainContent.addEventListener('change', async (event) => {
        const target = event.target;
        // Check if the changed element is a toggle switch in the main table (not in an editing row)
        // Support both old table layout and new card layout
        if (target.matches('input[type="checkbox"]')) {
            // Find the task switch container to ensure we're only handling the enable/disable toggle
            const taskSwitch = target.closest('.task-switch, .switch');
            if (!taskSwitch) return; // Not a task switch, ignore

            const row = target.closest('tr');
            const card = target.closest('.task-card');
            const taskId = target.dataset.taskId || (row ? row.dataset.taskId : null) || (card ? card.dataset.taskId : null);

            // Only process if it's a task toggle (not in editing mode)
            if (taskId && !target.closest('tr.editing')) {
                const isEnabled = target.checked;
                await updateTask(taskId, {enabled: isEnabled});
                // The visual state is already updated by the checkbox itself.
            }
        }
    });

    // Prevent click event bubbling from checkbox to parent buttons
    mainContent.addEventListener('click', (event) => {
        const target = event.target;
        if (target.matches('input[type="checkbox"]')) {
            event.stopPropagation();
        }
    }, true); // Use capture phase to intercept events early

    // --- Modal Logic ---
    const modal = document.getElementById('add-task-modal');
    if (modal) {
        const closeModalBtn = document.getElementById('close-modal-btn');
        const cancelBtn = document.getElementById('cancel-add-task-btn');
        const saveBtn = document.getElementById('save-new-task-btn');
        const form = document.getElementById('add-task-form');

        const closeModal = () => {
            modal.classList.remove('visible');
            setTimeout(() => {
                modal.style.display = 'none';
                form.reset(); // Reset form on close
            }, 300);
        };

        closeModalBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        let canClose = false;
        modal.addEventListener('mousedown', event => {
            canClose = event.target === modal;
        });
        modal.addEventListener('mouseup', (event) => {
            // Close if clicked on the overlay background
            if (canClose && event.target === modal) {
                closeModal();
            }
        });

        saveBtn.addEventListener('click', async () => {
            if (form.checkValidity() === false) {
                form.reportValidity();
                return;
            }

            const formData = new FormData(form);
            const data = {
                task_name: formData.get('task_name'),
                keyword: formData.get('keyword'),
                description: formData.get('description'),
                min_price: formData.get('min_price') || null,
                max_price: formData.get('max_price') || null,
                personal_only: formData.get('personal_only') === 'on',
                max_pages: parseInt(formData.get('max_pages'), 10) || 3,
                cron: formData.get('cron') || null,
            };

            // Show loading state
            const btnText = saveBtn.querySelector('.btn-text');
            const spinner = saveBtn.querySelector('.spinner');
            btnText.style.display = 'none';
            spinner.style.display = 'inline-block';
            saveBtn.disabled = true;

            const result = await createTaskWithAI(data);

            // Hide loading state
            btnText.style.display = 'inline-block';
            spinner.style.display = 'none';
            saveBtn.disabled = false;

            if (result && result.task) {
                closeModal();
                // Refresh task list
                const container = document.getElementById('tasks-table-container');
                if (container) {
                    const tasks = await fetchTasks();
                    container.innerHTML = renderTasksTable(tasks);
                }
            }
        });
    }

    // --- refresh criteria Modal Logic ---
    const refreshCriteriaModal = document.getElementById('refresh-criteria-modal');
    if (refreshCriteriaModal) {
        const form = document.getElementById('refresh-criteria-form');
        const closeModalBtn = document.getElementById('close-refresh-criteria-btn');
        const cancelBtn = document.getElementById('cancel-refresh-criteria-btn');
        const refreshBtn = document.getElementById('refresh-criteria-btn');

        const closeModal = () => {
            refreshCriteriaModal.classList.remove('visible');
            setTimeout(() => {
                refreshCriteriaModal.style.display = 'none';
                form.reset(); // Reset form on close
            }, 300);
        };

        closeModalBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        let canClose = false;
        refreshCriteriaModal.addEventListener('mousedown', event => {
            canClose = event.target === refreshCriteriaModal;
        });
        refreshCriteriaModal.addEventListener('mouseup', (event) => {
            // Close if clicked on the overlay background
            if (canClose && event.target === refreshCriteriaModal) {
                closeModal();
            }
        });

        refreshBtn.addEventListener('click', async () => {
            if (form.checkValidity() === false) {
                form.reportValidity();
                return;
            }
            const btnText = refreshBtn.querySelector('.btn-text');
            const spinner = refreshBtn.querySelector('.spinner');

            // Show loading state
            btnText.style.display = 'none';
            spinner.style.display = 'inline-block';
            refreshBtn.disabled = true;

            const taskId = refreshCriteriaModal.dataset.taskId
            const formData = new FormData(form);
            const result = await updateTask(taskId, {description: formData.get('description')});

            // Hide loading state
            btnText.style.display = 'inline-block';
            spinner.style.display = 'none';
            refreshBtn.disabled = false;

            if (result && result.task) {
                closeModal();
            }
        })

    }

    // --- Edit Task Modal Logic ---
    const editTaskModal = document.getElementById('edit-task-modal');
    if (editTaskModal) {
        const form = document.getElementById('edit-task-form');
        const closeModalBtn = document.getElementById('close-edit-task-btn');
        const cancelBtn = document.getElementById('cancel-edit-task-btn');
        const saveBtn = document.getElementById('save-edit-task-btn');
        const cronPresetSelect = document.getElementById('edit-cron-preset');
        const cronInput = document.getElementById('edit-cron');

        const closeModal = () => {
            editTaskModal.classList.remove('visible');
            setTimeout(() => {
                editTaskModal.style.display = 'none';
                form.reset(); // Reset form on close
            }, 300);
        };

        closeModalBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);

        let canClose = false;
        editTaskModal.addEventListener('mousedown', event => {
            canClose = event.target === editTaskModal;
        });
        editTaskModal.addEventListener('mouseup', (event) => {
            // Close if clicked on the overlay background
            if (canClose && event.target === editTaskModal) {
                closeModal();
            }
        });

        // Cron preset select change handler
        cronPresetSelect.addEventListener('change', function() {
            if (this.value && this.value !== 'custom') {
                cronInput.value = this.value;
            }
        });

        // Save button handler
        saveBtn.addEventListener('click', async () => {
            if (form.checkValidity() === false) {
                form.reportValidity();
                return;
            }

            const taskId = document.getElementById('edit-task-id').value;
            const formData = new FormData(form);

            const updatedData = {
                task_name: formData.get('task_name'),
                keyword: formData.get('keyword'),
                min_price: formData.get('min_price') || null,
                max_price: formData.get('max_price') || null,
                personal_only: formData.get('personal_only') === 'on',
                max_pages: parseInt(formData.get('max_pages'), 10) || 3,
                cron: formData.get('cron') || null
            };

            saveBtn.disabled = true;
            saveBtn.textContent = '保存中...';

            const result = await updateTask(taskId, updatedData);

            saveBtn.disabled = false;
            saveBtn.textContent = '保存';

            if (result && result.task) {
                closeModal();
                // Refresh task list
                const container = document.getElementById('tasks-table-container');
                if (container) {
                    const tasks = await fetchTasks();
                    container.innerHTML = renderTasksTable(tasks);
                }
            }
        });
    }


    // Initial load
    refreshLoginStatusWidget();
    navigateTo(window.location.hash || '#tasks');

    // --- Global Event Listener for header/modals ---
    document.body.addEventListener('click', async (event) => {
        const target = event.target;
        const widgetUpdateBtn = target.closest('#update-login-state-btn-widget');
        const widgetDeleteBtn = target.closest('#delete-login-state-btn-widget');
        const copyCodeBtn = target.closest('#copy-login-script-btn');

        if (copyCodeBtn) {
            event.preventDefault();
            const codeToCopy = document.getElementById('login-script-code').textContent.trim();

            // 在安全上下文中使用现代剪贴板API，否则使用备用方法
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(codeToCopy).then(() => {
                    copyCodeBtn.textContent = '已复制!';
                    setTimeout(() => {
                        copyCodeBtn.textContent = '复制脚本';
                    }, 2000);
                }).catch(err => {
                    console.error('无法使用剪贴板API复制文本: ', err);
                    alert('复制失败，请手动复制。');
                });
            } else {
                // 针对非安全上下文 (如HTTP) 或旧版浏览器的备用方案
                const textArea = document.createElement("textarea");
                textArea.value = codeToCopy;
                // 使文本区域不可见
                textArea.style.position = "fixed";
                textArea.style.top = "-9999px";
                textArea.style.left = "-9999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    copyCodeBtn.textContent = '已复制!';
                    setTimeout(() => {
                        copyCodeBtn.textContent = '复制脚本';
                    }, 2000);
                } catch (err) {
                    console.error('备用方案: 无法复制文本', err);
                    alert('复制失败，请手动复制。');
                }
                document.body.removeChild(textArea);
            }
        } else if (widgetUpdateBtn) {
            event.preventDefault();
            const modal = document.getElementById('login-state-modal');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('visible'), 10);
        } else if (widgetDeleteBtn) {
            event.preventDefault();
            if (confirm('你确定要删除登录凭证 (xianyu_state.json) 吗？删除后需要重新设置才能运行任务。')) {
                const result = await deleteLoginState();
                if (result) {
                    alert(result.message);
                    await refreshLoginStatusWidget(); // Refresh the widget UI
                    // Also refresh settings view if it's currently active
                    if (window.location.hash === '#settings' || window.location.hash === '') {
                        const statusContainer = document.getElementById('system-status-container');
                        if (statusContainer) {
                            const status = await fetchSystemStatus();
                            statusContainer.innerHTML = renderSystemStatus(status);
                        }
                    }
                }
            }
        }
    });

    // --- JSON Viewer Modal Logic ---
    const jsonViewerModal = document.getElementById('json-viewer-modal');
    if (jsonViewerModal) {
        const closeBtn = document.getElementById('close-json-viewer-btn');

        const closeModal = () => {
            jsonViewerModal.classList.remove('visible');
            setTimeout(() => {
                jsonViewerModal.style.display = 'none';
            }, 300);
        };

        closeBtn.addEventListener('click', closeModal);
        jsonViewerModal.addEventListener('click', (event) => {
            if (event.target === jsonViewerModal) {
                closeModal();
            }
        });
    }

    // --- Login State Modal Logic ---
    const loginStateModal = document.getElementById('login-state-modal');
    if (loginStateModal) {
        const closeBtn = document.getElementById('close-login-state-modal-btn');
        const cancelBtn = document.getElementById('cancel-login-state-btn');
        const saveBtn = document.getElementById('save-login-state-btn');
        const form = document.getElementById('login-state-form');
        const contentTextarea = document.getElementById('login-state-content');

        const closeModal = () => {
            loginStateModal.classList.remove('visible');
            setTimeout(() => {
                loginStateModal.style.display = 'none';
                form.reset();
            }, 300);
        };

        async function updateLoginState(content) {
            saveBtn.disabled = true;
            saveBtn.textContent = '保存中...';
            try {
                const response = await fetch('/api/login-state', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({content: content}),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.detail || '更新登录状态失败');
                }
                alert('登录状态更新成功！');
                closeModal();
                await refreshLoginStatusWidget(); // Refresh the widget UI
                // Also refresh settings view if it's currently active
                if (window.location.hash === '#settings') {
                    await initializeSettingsView();
                }
            } catch (error) {
                console.error('更新登录状态时出错:', error);
                alert(`更新失败: ${error.message}`);
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = '保存';
            }
        }

        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        loginStateModal.addEventListener('click', (event) => {
            if (event.target === loginStateModal) {
                closeModal();
            }
        });

        saveBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const content = contentTextarea.value.trim();
            if (!content) {
                alert('请粘贴从浏览器获取的JSON内容。');
                return;
            }
            await updateLoginState(content);
        });

    }
});
