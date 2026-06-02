document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const diffButtons = document.querySelectorAll('.diff-btn');
    const btnStart = document.getElementById('btn-start');
    const btnReset = document.getElementById('btn-reset');
    const timerValue = document.getElementById('timer-value');
    const liveMistakes = document.getElementById('live-mistakes');
    const liveCombo = document.getElementById('live-combo');
    const playerProgress = document.getElementById('player-progress');
    const aiProgress = document.getElementById('ai-progress');
    const typingCard = document.getElementById('typing-card');
    const keyboardCapturer = document.getElementById('keyboard-capturer');
    const paragraphContainer = document.getElementById('paragraph-container');
    const focusOverlay = document.getElementById('focus-overlay');
    const langSelect = document.getElementById('lang-select');
    const langSelectorContainer = document.querySelector('.language-selector');
    
    // Results Elements
    const resultsDashboard = document.getElementById('results-dashboard');
    const resWpm = document.getElementById('res-wpm');
    const resAccuracy = document.getElementById('res-accuracy');
    const resCharsBreakdown = document.getElementById('res-chars-breakdown');
    const resScore = document.getElementById('res-score');
    const resRank = document.getElementById('res-rank');
    const heatmapKeys = document.querySelectorAll('.key');

    // Theme Switcher DOM Elements
    const modeToggle = document.getElementById('mode-toggle');
    const modeIcon = modeToggle.querySelector('.mode-icon');
    const themeSelectBtn = document.getElementById('theme-select-btn');
    const themePickerWrapper = document.getElementById('theme-picker-wrapper');
    const themeOptions = document.querySelectorAll('.theme-option');
    const currentThemeName = document.getElementById('current-theme-name');

    // Custom Paragraph DOM Elements
    const customModal = document.getElementById('custom-modal');
    const customTextInput = document.getElementById('custom-text-input');
    const btnModalCancel = document.getElementById('btn-modal-cancel');
    const btnModalSave = document.getElementById('btn-modal-save');
    const charCounter = document.getElementById('char-counter');

    // Auth DOM Elements
    const authPortal = document.getElementById('auth-portal');
    const appWorkspace = document.getElementById('app-workspace');
    const userProfileBadge = document.getElementById('user-profile-badge');
    const headerUsername = document.getElementById('header-username');
    const btnLogout = document.getElementById('btn-logout');
    
    const tabLogin = document.getElementById('portal-tab-login');
    const tabSignup = document.getElementById('portal-tab-signup');
    const formLogin = document.getElementById('portal-form-login');
    const formSignup = document.getElementById('portal-form-signup');
    const loginUsernameInput = document.getElementById('portal-login-username');
    const loginPasswordInput = document.getElementById('portal-login-password');
    const signupUsernameInput = document.getElementById('portal-signup-username');
    const signupEmailInput = document.getElementById('portal-signup-email');
    const signupPasswordInput = document.getElementById('portal-signup-password');
    const signupConfirmPasswordInput = document.getElementById('portal-signup-confirm-password');
    const loginError = document.getElementById('portal-login-error');
    const signupError = document.getElementById('portal-signup-error');

    // Navigation & Views DOM Elements
    const navItems = document.querySelectorAll('.nav-item');
    const navIndicator = document.getElementById('nav-indicator');
    const viewDashboard = document.getElementById('view-dashboard');
    const viewHistory = document.getElementById('view-history');
    const historyList = document.getElementById('history-list');
    
    // Floating Navigation Dock Element
    const floatingNav = document.getElementById('workspace-nav');

    // State Variables
    let activeParagraph = '';
    let difficulty = 'easy';
    let previousDifficulty = 'easy';
    let customParagraphText = localStorage.getItem('typex-custom-paragraph') || '';
    let loggedInUser = localStorage.getItem('typex-username') || '';
    let isTestRunning = false;
    let isTestCompleted = false;
    
    let timerInterval = null;
    let wpmInterval = null;
    let aiInterval = null;
    
    let totalDuration = 60; // 60 seconds limit
    let timeLeft = 60;
    let startTime = null;
    
    let currentIndex = 0;
    let correctCount = 0;
    let wrongCount = 0;
    let comboStreak = 0;
    
    // AI Opponent WPM Speeds
    const aiSpeeds = {
        easy: 25,
        medium: 45,
        hard: 65
    };
    let aiProgressPct = 0;

    // ==================== THEME MANAGEMENT ====================
    let currentTheme = localStorage.getItem('typex-theme') || 'default';
    if (!['default', 'cyberpunk', 'hacker'].includes(currentTheme)) {
        currentTheme = 'default';
    }
    let currentMode = localStorage.getItem('typex-mode') || 'light';

    function applyTheme(theme, mode) {
        document.body.setAttribute('data-theme', theme);
        document.body.setAttribute('data-mode', mode);
        
        // Mode switch is always visible for all themes
        modeToggle.style.display = 'flex';

        // Update mode toggle icon
        modeIcon.textContent = mode === 'dark' ? '🌙' : '☀️';
        
        // Update current theme display name in button
        const themeMap = {
            'default': 'Classic',
            'cyberpunk': 'Cyberpunk',
            'hacker': 'Hacker'
        };
        currentThemeName.textContent = themeMap[theme] || 'Classic';
        
        // Update active class in dropdown options
        themeOptions.forEach(opt => {
            if (opt.dataset.theme === theme) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });
        
        // Update current theme dot color dynamically based on variables
        const themeDots = {
            'default': mode === 'dark' ? '#ff7a00' : '#ea580c',
            'cyberpunk': '#ff007f',
            'hacker': '#00ff66'
        };
        const dotColor = themeDots[theme] || '#ff7a00';
        const dotEl = themeSelectBtn.querySelector('.current-theme-dot');
        if (dotEl) {
            dotEl.style.background = dotColor;
            dotEl.style.boxShadow = `0 0 8px ${dotColor}`;
        }

        // Save to localStorage
        localStorage.setItem('typex-theme', theme);
        localStorage.setItem('typex-mode', mode);
    }

    // Toggle Light/Dark mode
    modeToggle.addEventListener('click', () => {
        currentMode = currentMode === 'dark' ? 'light' : 'dark';
        applyTheme(currentTheme, currentMode);
    });

    // Toggle theme picker dropdown display
    themeSelectBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themePickerWrapper.classList.toggle('active');
    });

    // Theme option click handlers
    themeOptions.forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            currentTheme = opt.dataset.theme;
            applyTheme(currentTheme, currentMode);
            themePickerWrapper.classList.remove('active');
        });
    });

    // Close dropdown on outside click
    document.addEventListener('click', () => {
        themePickerWrapper.classList.remove('active');
    });

    // Initialize theme on start
    applyTheme(currentTheme, currentMode);

    // ==================== CUSTOM PARAGRAPH MODAL ====================
    function openCustomModal() {
        customTextInput.value = customParagraphText;
        updateCharCounter();
        customModal.classList.add('active');
        setTimeout(() => customTextInput.focus(), 50);
    }

    function closeCustomModal() {
        customModal.classList.remove('active');
    }

    function updateCharCounter() {
        const len = customTextInput.value.length;
        charCounter.textContent = `${len}/1000 chars`;
        if (len >= 1000) {
            charCounter.style.color = 'var(--neon-red)';
        } else {
            charCounter.style.color = 'var(--text-secondary)';
        }
    }

    customTextInput.addEventListener('input', updateCharCounter);

    btnModalCancel.addEventListener('click', () => {
        closeCustomModal();
        // Restore difficulty buttons to previous active
        diffButtons.forEach(b => {
            if (b.dataset.difficulty === previousDifficulty) {
                b.classList.add('active');
            } else {
                b.classList.remove('active');
            }
        });
    });

    btnModalSave.addEventListener('click', () => {
        const text = customTextInput.value.trim();
        if (!text) {
            alert('Custom practice text cannot be empty.');
            return;
        }
        if (text.length > 1000) {
            alert('Custom practice text cannot exceed 1000 characters.');
            return;
        }
        
        customParagraphText = text;
        localStorage.setItem('typex-custom-paragraph', text);
        
        // Confirm difficulty change
        difficulty = 'custom';
        previousDifficulty = 'custom';
        diffButtons.forEach(b => b.classList.remove('active'));
        document.getElementById('diff-custom').classList.add('active');
        
        // Hide language selector for custom paragraphs
        if (langSelectorContainer) langSelectorContainer.style.display = 'none';
        
        closeCustomModal();
    });

    // ==================== USER AUTHENTICATION & HISTORY ====================
    function switchAuthTab(tab) {
        if (tab === 'login') {
            tabLogin.classList.add('active');
            tabSignup.classList.remove('active');
            formLogin.style.display = 'flex';
            formSignup.style.display = 'none';
        } else {
            tabLogin.classList.remove('active');
            tabSignup.classList.add('active');
            formLogin.style.display = 'none';
            formSignup.style.display = 'flex';
        }
        // Clear errors on tab switch
        loginError.textContent = '';
        signupError.textContent = '';
    }

    // Auth events
    tabLogin.addEventListener('click', () => switchAuthTab('login'));
    tabSignup.addEventListener('click', () => switchAuthTab('signup'));

    // Handle Login Submit
    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = '';
        const username = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();
            
            if (data.error) {
                loginError.textContent = data.error;
                return;
            }

            // Logged in successfully
            loggedInUser = data.username;
            localStorage.setItem('typex-username', loggedInUser);
            updateAuthState();
        } catch (err) {
            console.error('Login error:', err);
            loginError.textContent = 'Connection failed. Please try again.';
        }
    });

    // Handle Signup Submit
    formSignup.addEventListener('submit', async (e) => {
        e.preventDefault();
        signupError.textContent = '';
        const username = signupUsernameInput.value.trim();
        const email = signupEmailInput.value.trim();
        const password = signupPasswordInput.value;
        const confirmPassword = signupConfirmPasswordInput.value;

        if (password !== confirmPassword) {
            signupError.textContent = 'Passwords do not match.';
            return;
        }

        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await response.json();

            if (data.error) {
                signupError.textContent = data.error;
                return;
            }

            // Registered successfully - automatically log in
            loggedInUser = data.username;
            localStorage.setItem('typex-username', loggedInUser);
            updateAuthState();
        } catch (err) {
            console.error('Signup error:', err);
            signupError.textContent = 'Connection failed. Please try again.';
        }
    });

    // Switch between workspace view panels
    function switchWorkspaceView(viewId) {
        if (viewDashboard) viewDashboard.classList.remove('active');
        if (viewHistory) viewHistory.classList.remove('active');

        if (viewId === 'dashboard' && viewDashboard) {
            viewDashboard.classList.add('active');
        }

        if (viewId === 'history' && viewHistory) {
            viewHistory.classList.add('active');
            fetchAndRenderHistory();
        }

        navItems.forEach((btn) => {
            if (btn.dataset.view === viewId) {
                btn.classList.add('active');
                if (navIndicator) {
                    setTimeout(() => {
                        navIndicator.style.width = `${btn.offsetWidth}px`;
                        navIndicator.style.transform = `translateX(${btn.offsetLeft}px)`;
                    }, 0);
                }
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Attach navigation click events
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (isTestRunning) {
                alert("Please finish or reset the current typing test before navigating!");
                return;
            }
            switchWorkspaceView(item.dataset.view);
        });
    });

    // Handle Logout
    const logoutAction = () => {
        loggedInUser = '';
        localStorage.removeItem('typex-username');
        updateAuthState();
    };

    if (btnLogout) btnLogout.addEventListener('click', logoutAction);

    // Update Header and Dashboard UI based on authentication state
    function fetchAndRenderHistory() {
        if (!loggedInUser || !historyList) return;
        fetch(`/api/history?username=${loggedInUser}`)
            .then(response => response.json())
            .then(history => {
                if (!Array.isArray(history) || history.length === 0) {
                    historyList.innerHTML = `<tr><td colspan="7" class="no-history-msg">No practice runs logged yet. Let's practice!</td></tr>`;
                    return;
                }

                const sortedHistory = [...history].reverse();
                historyList.innerHTML = '';
                sortedHistory.forEach(run => {
                    const date = new Date(run.timestamp).toLocaleString();
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${date}</td>
                        <td style="text-transform: uppercase; font-weight: 700;">${run.difficulty}</td>
                        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--neon-blue);">${run.wpm}</td>
                        <td>${run.accuracy}%</td>
                        <td>${run.score}</td>
                        <td style="font-weight: 700; color: var(--neon-purple);">${run.rank}</td>
                        <td><button class="delete-run-btn" data-timestamp="${run.timestamp}">Delete</button></td>
                    `;
                    historyList.appendChild(row);
                });

                // Attach delete button listeners
                const deleteBtns = historyList.querySelectorAll('.delete-run-btn');
                deleteBtns.forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        const timestamp = btn.dataset.timestamp;
                        if (!confirm('Are you sure you want to delete this practice record?')) return;
                        
                        try {
                            const res = await fetch('/api/history', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ username: loggedInUser, timestamp })
                            });
                            const result = await res.json();
                            if (result.success) {
                                fetchAndRenderHistory(); // Reload history view
                            } else {
                                alert('Error: ' + (result.error || 'Failed to delete record.'));
                            }
                        } catch (err) {
                            console.error('Delete error:', err);
                            alert('Connection error. Failed to delete record.');
                        }
                    });
                });
            })
            .catch(err => {
                console.error('Failed to load history:', err);
                historyList.innerHTML = `<tr><td colspan="7" class="no-history-msg">Unable to load history.</td></tr>`;
            });
    }

    function updateAuthState() {
        if (loggedInUser) {
            document.body.classList.add('user-logged-in');
            authPortal.style.display = 'none';
            appWorkspace.style.display = 'block';
            userProfileBadge.style.display = 'flex';
            headerUsername.textContent = loggedInUser;
            
            switchWorkspaceView('dashboard');
        } else {
            document.body.classList.remove('user-logged-in');
            authPortal.style.display = 'block';
            appWorkspace.style.display = 'none';
            userProfileBadge.style.display = 'none';
            
            // Clear inputs when logged out
            loginUsernameInput.value = '';
            loginPasswordInput.value = '';
            signupUsernameInput.value = '';
            signupEmailInput.value = '';
            signupPasswordInput.value = '';
            signupConfirmPasswordInput.value = '';
            loginError.textContent = '';
            signupError.textContent = '';
            switchAuthTab('login');
        }
    }

    // Initialize Auth state on start
    updateAuthState();

    // Difficulty selection
    diffButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isTestRunning) return;
            const selectedDiff = btn.dataset.difficulty;
            if (selectedDiff === 'custom') {
                openCustomModal();
            } else {
                diffButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                difficulty = selectedDiff;
                previousDifficulty = selectedDiff;
                
                // Show language selector for standard paragraphs
                if (langSelectorContainer) langSelectorContainer.style.display = 'flex';
            }
        });
    });

    // Start typing test
    btnStart.addEventListener('click', async () => {
        if (isTestRunning) return;
        
        btnStart.disabled = true;
        btnStart.textContent = 'LOADING...';
        
        try {
            // 1. Fetch/Send paragraph from Assembly-backed API
            let response;
            if (difficulty === 'custom') {
                if (!customParagraphText) {
                    alert('Please enter some custom text first!');
                    openCustomModal();
                    btnStart.disabled = false;
                    btnStart.textContent = 'START TEST';
                    return;
                }
                response = await fetch('/api/paragraph/custom', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paragraph: customParagraphText })
                });
            } else {
                const lang = langSelect ? langSelect.value : 'english';
                response = await fetch(`/api/paragraph?difficulty=${difficulty}&language=${lang}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                alert('API Error: ' + data.error);
                resetStates();
                return;
            }
            
            activeParagraph = data.paragraph;
            setupParagraphDisplay(activeParagraph);
            
            // 2. Initialize state variables
            isTestRunning = true;
            isTestCompleted = false;
            currentIndex = 0;
            correctCount = 0;
            wrongCount = 0;
            if (liveMistakes) liveMistakes.textContent = '0';
            comboStreak = 0;
            aiProgressPct = 0;
            timeLeft = totalDuration;
            
            resultsDashboard.style.display = 'none';
            resetHeatmap();
            
            // 3. Enable capturer and focus
            keyboardCapturer.disabled = false;
            keyboardCapturer.value = '';
            typingCard.classList.add('focused');
            keyboardCapturer.focus();
            if (langSelect) langSelect.disabled = true;
            
            btnReset.disabled = false;
            btnStart.textContent = 'TEST RUNNING';
            
            // 4. Start clocks & AI racers
            startTime = Date.now();
            startTimer();
            
        } catch (err) {
            console.error('Failed to start test:', err);
            alert('Could not connect to the backend server. Make sure server.js is running.');
            resetStates();
        }
    });

    // Reset button
    btnReset.addEventListener('click', () => {
        resetStates();
    });

    // Typing card click to force focus
    typingCard.addEventListener('click', () => {
        if (isTestRunning && !isTestCompleted) {
            keyboardCapturer.focus();
        }
    });

    keyboardCapturer.addEventListener('focus', () => {
        if (isTestRunning) typingCard.classList.add('focused');
    });

    keyboardCapturer.addEventListener('blur', () => {
        typingCard.classList.remove('focused');
    });

    // Handle character input
    keyboardCapturer.addEventListener('input', (e) => {
        if (!isTestRunning || isTestCompleted) return;

        const val = keyboardCapturer.value;
        
        // Loop through input value to update correctness state
        while (currentIndex < val.length && currentIndex < activeParagraph.length) {
            const typedChar = val[currentIndex];
            const expectedChar = activeParagraph[currentIndex];
            const charSpan = document.getElementById(`char-${currentIndex}`);
            
            if (typedChar === expectedChar) {
                // Correct character
                charSpan.className = 'char correct';
                correctCount++;
                comboStreak++;
                liveCombo.textContent = `${comboStreak}x`;
            } else {
                // Typos / Mistakes
                charSpan.className = 'char incorrect';
                wrongCount++;
                if (liveMistakes) liveMistakes.textContent = wrongCount;
                comboStreak = 0; // reset combo
                liveCombo.textContent = '0x';
                
                // Shake overlay to show impact
                typingCard.classList.add('shake-ani');
                setTimeout(() => typingCard.classList.remove('shake-ani'), 200);
            }
            
            // Move cursor forward
            charSpan.classList.remove('current');
            currentIndex++;
            
            if (currentIndex < activeParagraph.length) {
                const nextSpan = document.getElementById(`char-${currentIndex}`);
                nextSpan.classList.add('current');
            }
            
            // Update player progress bar
            const progress = (currentIndex / activeParagraph.length) * 100;
            playerProgress.style.width = `${progress}%`;
        }

        // Check if finished
        if (currentIndex >= activeParagraph.length) {
            completeTest();
        }
    });

    // Parse paragraph letters into individual spans
    function setupParagraphDisplay(text) {
        paragraphContainer.innerHTML = '';
        for (let i = 0; i < text.length; i++) {
            const span = document.createElement('span');
            span.id = `char-${i}`;
            span.className = 'char';
            span.textContent = text[i];
            paragraphContainer.appendChild(span);
        }
        // Focus first character
        if (paragraphContainer.firstChild) {
            paragraphContainer.firstChild.classList.add('current');
        }
    }

    // Countdown Timer Loop
    function startTimer() {
        timerValue.textContent = `${timeLeft}s`;
        
        timerInterval = setInterval(() => {
            timeLeft--;
            timerValue.textContent = `${timeLeft}s`;
            
            // Update time progress bar (goes from 0% to 100% as timeLeft counts down to 0)
            const timeProgressPct = ((totalDuration - timeLeft) / totalDuration) * 100;
            if (aiProgress) {
                aiProgress.style.width = `${timeProgressPct}%`;
            }
            
            if (timeLeft <= 0) {
                completeTest();
            }
        }, 1000);
    }

    // Complete typing test and run analytics via Assembly
    async function completeTest() {
        isTestCompleted = true;
        isTestRunning = false;
        
        clearInterval(timerInterval);
        clearInterval(aiInterval);
        
        keyboardCapturer.disabled = true;
        typingCard.classList.remove('focused');
        typingCard.classList.add('completed');
        if (langSelect && difficulty !== 'custom') langSelect.disabled = false;
        
        btnStart.textContent = 'TEST OVER';
        
        // Calculate total elapsed seconds
        const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        const typedText = keyboardCapturer.value;

        // Display fetching stats message
        paragraphContainer.innerHTML = '<div class="placeholder-msg">Analyzing results with Assembly Engine...</div>';

        try {
            const payload = {
                typedText,
                originalText: activeParagraph,
                timeSeconds: elapsedSeconds,
                username: loggedInUser,
                difficulty: difficulty
            };
            console.log('Sending calculate payload to backend:', payload);

            // POST text and elapsed time to backend to execute Assembly calculation
            const response = await fetch('/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const results = await response.json();
            console.log('Received calculation results from backend:', results);
            
            if (results.error) {
                alert('Calculation Error: ' + results.error);
                resetStates();
                return;
            }

            // Render calculations returned by the Assembly engine
            resWpm.textContent = results.wpm;
            resAccuracy.textContent = `${results.accuracy}%`;
            resCharsBreakdown.textContent = `${results.correctChars} correct / ${results.wrongChars} mistakes`;
            resScore.textContent = results.score;
            resRank.textContent = results.rank;
            
            // Map weak letter mistakes onto keyboard heatmap
            renderHeatmap(results.mistakes);
            
            // Show results section
            resultsDashboard.style.display = 'block';
            resultsDashboard.scrollIntoView({ behavior: 'smooth' });

            btnStart.disabled = false;
            btnStart.textContent = 'TRY AGAIN';
            
        } catch (err) {
            console.error('Calculation fetch error:', err);
            alert('Failed to send data to Assembly calculation backend.');
            resetStates();
        }
    }

    // Weak Keys Heatmap Renderer
    function renderHeatmap(mistakes) {
        resetHeatmap();
        if (!mistakes) return;

        Object.keys(mistakes).forEach(char => {
            const count = mistakes[char];
            const upperChar = char.toUpperCase();
            const keyEl = document.querySelector(`.key[data-key="${upperChar}"]`);
            
            if (keyEl) {
                if (count >= 5) {
                    keyEl.classList.add('error-level-3');
                } else if (count >= 3) {
                    keyEl.classList.add('error-level-2');
                } else if (count > 0) {
                    keyEl.classList.add('error-level-1');
                }
            }
        });
    }

    function resetHeatmap() {
        heatmapKeys.forEach(key => {
            key.className = 'key'; // Reset classes
        });
    }

    // Reset application state back to default
    function resetStates() {
        isTestRunning = false;
        isTestCompleted = false;
        
        clearInterval(timerInterval);
        clearInterval(wpmInterval);
        clearInterval(aiInterval);
        
        currentIndex = 0;
        correctCount = 0;
        wrongCount = 0;
        comboStreak = 0;
        aiProgressPct = 0;
        
        timerValue.textContent = '--s';
        if (liveMistakes) liveMistakes.textContent = '0';
        liveCombo.textContent = '0x';
        
        playerProgress.style.width = '0%';
        aiProgress.style.width = '0%';
        
        keyboardCapturer.disabled = true;
        keyboardCapturer.value = '';
        typingCard.className = 'typing-interface card';
        
        paragraphContainer.innerHTML = '<div class="placeholder-msg">Select difficulty and click START TEST to begin...</div>';
        
        resultsDashboard.style.display = 'none';
        resetHeatmap();
        
        if (langSelect && difficulty !== 'custom') langSelect.disabled = false;
        
        btnStart.disabled = false;
        btnStart.textContent = 'START TEST';
        btnReset.disabled = true;
    }
});
