const API_BASE_URL = window.location.protocol === 'file:' ? 'http://127.0.0.1:5000' : ''; // Uses current domain dynamically in production and localhost when running locally.

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 0. Toast Notification System ---
    window.showNotification = function(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        let iconClass = 'fa-circle-info';
        if (type === 'success') iconClass = 'fa-circle-check';
        if (type === 'error') iconClass = 'fa-circle-exclamation';
        toast.innerHTML = `<i class="fa-solid ${iconClass} toast-icon"></i><span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 400); 
        }, 3000);
    };

    // --- 0.5 Notification Dropdown System ---
    const notifBell = document.getElementById('notificationBell');
    const notifDropdown = document.getElementById('notificationDropdown');
    const badge = document.getElementById('notificationBadge');
    
    if (notifBell && notifDropdown) {
        // Toggle dropdown
        notifBell.addEventListener('click', (e) => {
            if(e.target.classList.contains('clear-all')) return;
            notifDropdown.classList.toggle('open');
        });

        // Click outside closes it
        document.addEventListener('click', (e) => {
            if (!notifBell.contains(e.target)) {
                notifDropdown.classList.remove('open');
            }
        });

        // Global function to add notification
        window.addNotification = function(message, type = 'primary') {
            const list = document.getElementById('notificationList');
            if (!list) return;

            let iconHTML = '';
            if (type === 'success') iconHTML = '<i class="fa-solid fa-seedling"></i>';
            else if (type === 'warning') iconHTML = '<i class="fa-solid fa-virus"></i>';
            else if (type === 'info') iconHTML = '<i class="fa-solid fa-chart-line"></i>';
            else iconHTML = '<i class="fa-solid fa-indian-rupee-sign"></i>';

            const newItem = document.createElement('div');
            newItem.className = 'notif-item unread';
            newItem.innerHTML = `
                <div class="notif-icon ${type}">${iconHTML}</div>
                <div class="notif-content">
                    <p>${message}</p>
                    <span class="time">Just now</span>
                </div>
            `;
            
            const emptyState = list.querySelector('.empty-state-text');
            if (emptyState) emptyState.remove();

            list.insertBefore(newItem, list.firstChild);
            updateBadgeCount();
        };

        window.clearNotifications = function() {
            const list = document.getElementById('notificationList');
            if (list) {
                list.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.9rem;" class="empty-state-text">
                        No new notifications
                    </div>
                `;
                updateBadgeCount();
            }
        };

        function updateBadgeCount() {
            const list = document.getElementById('notificationList');
            const unreadItems = list.querySelectorAll('.notif-item.unread');
            if (badge) {
                badge.innerText = unreadItems.length;
                if (unreadItems.length === 0) {
                    badge.style.display = 'none';
                } else {
                    badge.style.display = 'flex';
                }
            }
        }
        updateBadgeCount();
    }
    
    // --- 1. Login Page Logic ---
    const loginForm = document.getElementById('loginForm');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');

    // Toggle Password Visibility
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.classList.toggle('fa-eye');
            togglePassword.classList.toggle('fa-eye-slash');
        });
    }

    // Handle Login Submit
    if (loginForm) {
        // If we are on login page, clear old session
        localStorage.removeItem('isLoggedIn');

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = passwordInput.value;

            // Button loading state
            const btn = loginForm.querySelector('.login-btn');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...`;
            btn.style.opacity = '0.8';

            try {
                const response = await fetch(`${API_BASE_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (response.ok && data.status === 'success') {
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('user', data.user.email);
                    localStorage.setItem('userName', data.user.fullname);
                    localStorage.setItem('justLoggedIn', 'true');

                    window.showNotification("Login Successful. Redirecting...", "success");

                    setTimeout(() => {
                        window.location.href = 'main_advisor.html';
                    }, 1200);
                } else {
                    window.showNotification(data.message || "Invalid credentials.", "error");
                    btn.innerHTML = originalHtml;
                    btn.style.opacity = '1';
                }
            } catch (error) {
                console.error('Login Error:', error);
                window.showNotification("Server connection failed.", "error");
                btn.innerHTML = originalHtml;
                btn.style.opacity = '1';
            }
        });
    }

    // --- 1.1 Signup/Login Toggle ---
    const signupForm = document.getElementById('signupForm');
    const loginRedirect = document.getElementById('loginRedirect');
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');
    const loginHeading = document.querySelector('.login-form-container .welcome-text'); // Need to target specific one if not inside form

    if (showSignup && signupForm && loginForm) {
        showSignup.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hide');
            loginRedirect.classList.add('hide');
            signupForm.classList.remove('hide');
        });

        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            signupForm.classList.add('hide');
            loginForm.classList.remove('hide');
            loginRedirect.classList.remove('hide');
        });
    }

    // Handle Signup Submit
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullname = document.getElementById('regName').value;
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;

            const btn = signupForm.querySelector('.signup-btn');
            const originalHtml = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...`;

            try {
                const response = await fetch(`${API_BASE_URL}/api/signup`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fullname, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    window.showNotification("Account Created! Please Login.", "success");
                    setTimeout(() => {
                        signupForm.classList.add('hide');
                        loginForm.classList.remove('hide');
                        loginRedirect.classList.remove('hide');
                    }, 1500);
                } else {
                    window.showNotification(data.message || "Signup failed.", "error");
                    btn.innerHTML = originalHtml;
                }
            } catch (error) {
                window.showNotification("Server error during signup.", "error");
                btn.innerHTML = originalHtml;
            }
        });
    }

    // --- 2. Dashboard Page Logic ---
    const isDashboard = document.querySelector('.dashboard-body');
    
    if (isDashboard) {
        // Auth guard
        if (localStorage.getItem('isLoggedIn') !== 'true') {
            window.location.href = 'index.html';
            return;
        }

        if (localStorage.getItem('justLoggedIn') === 'true') {
            setTimeout(() => window.showNotification("Login Successful", "success"), 300);
            localStorage.removeItem('justLoggedIn');
        }

        // --- User Profile Display ---
        let user = localStorage.getItem('user') || localStorage.getItem('userEmail');
        if (user) {
            const userNameEl = document.querySelector('.user-profile .user-name');
            const avatarEl = document.querySelector('.user-profile .avatar');
            
            // Format name (get part before @)
            const displayName = user.split('@')[0];
            
            if (userNameEl) userNameEl.textContent = displayName;
            if (avatarEl) avatarEl.src = `https://ui-avatars.com/api/?name=${displayName}&background=10b981&color=fff`;
        }

        // --- Live Location Detector ---
        window.detectLocation = function() {
            const locationInput = document.getElementById('crop_location');
            
            if (!navigator.geolocation) {
                window.showNotification("Geolocation is not supported by your browser", "error");
                return;
            }

            locationInput.placeholder = "Detecting your location...";
            
            navigator.geolocation.getCurrentPosition(async (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;

                try {
                    // Using OpenStreetMap's free reverse geocoding
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`);
                    const data = await response.json();
                    
                    if (data && data.address) {
                        const city = data.address.city || data.address.town || data.address.village || data.address.county || "";
                        const state = data.address.state || "";
                        const country = data.address.country || "";
                        
                        locationInput.value = `${city}${city && state ? ', ' : ''}${state}${state && country ? ', ' : ''}${country}`;
                        window.showNotification("Location detected successfully!", "success");

                        // --- Automatic Soil Analysis based on Location ---
                        try {
                            const soilRes = await fetch(`${API_BASE_URL}/api/get-soil-info`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ location: locationInput.value })
                            });
                            const soilData = await soilRes.json();
                            if (soilData.status === 'success') {
                                const soilDropdown = document.getElementById('crop_soil_type');
                                if (soilDropdown) {
                                    const options = Array.from(soilDropdown.options);
                                    const match = options.find(opt => opt.value === soilData.soil_type);
                                    if (match) {
                                        soilDropdown.value = soilData.soil_type;
                                        window.showNotification(`Detected ${soilData.soil_type} for your region`, "info");
                                    }
                                }
                            } else {
                                window.showNotification(soilData.message || "Invalid location. Please enter a real farming area.", "error");
                            }
                        } catch (soilErr) {
                            // If API returns 400, it's an error status
                            window.showNotification("Invalid location detected. Please check your input.", "error");
                        }
                    } else {
                        locationInput.value = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
                        window.showNotification("Coordinates found, but address service failed.", "info");
                    }
                } catch (e) {
                    locationInput.value = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
                    window.showNotification("Using raw coordinates due to network error.", "info");
                }
            }, (error) => {
                locationInput.placeholder = "e.g. Indore, MP";
                window.showNotification("Location access denied. Please type manually.", "error");
            });
        };

        // --- Navigation Logic ---
        const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
        const sections = document.querySelectorAll('.view-section');
        const imageCards = document.querySelectorAll('.image-card[data-navigate]');
        const pageTitle = document.getElementById('pageTitle');

        const mapTitle = {
            'dashboard-home': 'Dashboard Overview',
            'crop-recommendation': 'Crop Recommendation AI',
            'yield-prediction': 'Yield Prediction Tool',
            'disease-detection': 'Disease Diagnosis',
            'market-prices': 'Live Market Prices'
        };

        function activateSection(targetId) {
            // Remove active from links
            navLinks.forEach(link => link.classList.remove('active'));
            
            // Find target link and set active
            const activeLink = Array.from(navLinks).find(l => l.getAttribute('data-target') === targetId);
            if (activeLink) {
                activeLink.classList.add('active');
            }

            // Hide all sections
            sections.forEach(sec => sec.classList.remove('active'));
            
            // Show target section
            const targetSec = document.getElementById(targetId);
            if (targetSec) {
                targetSec.classList.add('active');
                pageTitle.textContent = mapTitle[targetId];
            }
        }

        // Sidebar clicks
        navLinks.forEach(link => {
            if (link.id === 'logoutBtn') return; // skip logout
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = link.getAttribute('data-target');
                activateSection(target);
                if (target === 'market-prices') {
                    window.loadMarketPrices();
                    window.updateChart();
                }
            });
        });

        // Image Card clicks
        imageCards.forEach(card => {
            card.addEventListener('click', () => {
                const target = card.getAttribute('data-navigate');
                activateSection(target);
                if (target === 'market-prices') {
                    window.loadMarketPrices();
                    window.updateChart();
                }
            });
        });

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('isLoggedIn');
                window.location.href = 'index.html';
            });
        }

        // --- Disease Image Upload Logic ---
        const uploadArea = document.getElementById('uploadArea');
        const diseaseImageInput = document.getElementById('diseaseImage');
        const previewContainer = document.getElementById('previewContainer');
        const imagePreview = document.getElementById('imagePreview');

        if (uploadArea && diseaseImageInput) {
            
            // Drag over effects
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--primary)';
                uploadArea.style.background = 'var(--primary-light)';
            });

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--border)';
                uploadArea.style.background = '#FAFAFA';
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = 'var(--border)';
                uploadArea.style.background = '#FAFAFA';
                
                if (e.dataTransfer.files.length > 0) {
                    handleFileSelect(e.dataTransfer.files[0]);
                }
            });

            diseaseImageInput.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    handleFileSelect(this.files[0]);
                }
            });

            function handleFileSelect(file) {
                if (!file.type.startsWith('image/')) {
                    alert('Please select an image file.');
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    uploadArea.classList.add('hide');
                    previewContainer.classList.remove('hide');
                    
                    window.showNotification("Image uploaded successfully", "success");
                    
                    // Reset result panel
                    document.getElementById('diseaseResult').innerHTML = `
                        <i class="fa-solid fa-microscope"></i>
                        <p>Image loaded. Ready for scan.</p>
                    `;
                    document.getElementById('diseaseResult').className = 'empty-state';
                };
                reader.readAsDataURL(file);
            }
            
            window.clearPreview = function() {
                diseaseImageInput.value = '';
                imagePreview.src = '';
                uploadArea.classList.remove('hide');
                previewContainer.classList.add('hide');
                document.getElementById('diseaseResult').innerHTML = `
                    <i class="fa-solid fa-microscope"></i>
                    <p>Upload an image for diagnosis...</p>
                `;
                document.getElementById('diseaseResult').className = 'empty-state';
            }
        }
    }
});

// --- Market Table Filter ---
window.filterMarketTable = function() {
    const input = document.getElementById("marketSearchInput");
    const filter = input.value.toLowerCase();
    const table = document.getElementById("marketTableBody");
    const tr = table.getElementsByTagName("tr");

    for (let i = 0; i < tr.length; i++) {
        const tdName = tr[i].getElementsByTagName("td")[0];
        const tdMandi = tr[i].getElementsByTagName("td")[1];
        
        if (tdName || tdMandi) {
            const txtValueName = tdName.textContent || tdName.innerText;
            const txtValueMandi = tdMandi.textContent || tdMandi.innerText;
            
            if (txtValueName.toLowerCase().indexOf(filter) > -1 || 
                txtValueMandi.toLowerCase().indexOf(filter) > -1) {
                tr[i].style.display = "";
            } else {
                tr[i].style.display = "none";
            }
        }
    }
};

// --- Market Price Fetcher & Live Updates ---
let previousPrices = {};

window.loadMarketPrices = async function(isTickerOnly = false) {
    const tableBody = document.getElementById('marketTableBody');
    const tickerEl = document.getElementById('liveTicker');

    try {
        const response = await fetch(`${API_BASE_URL}/api/market-prices`);
        const data = await response.json();

        if (data.status === 'success') {
            // Update Ticker
            if (tickerEl) {
                tickerEl.innerHTML = data.prices.map(item => `
                    <span class="ticker-item">
                        ${item.name} (${item.mandi}): 
                        <span class="ticker-price">₹${item.price}</span> 
                        <span class="ticker-trend ${item.status === 'up' ? 'trend-up' : 'trend-down'}">
                            ${item.status === 'up' ? '▲' : '▼'} ${item.trend}
                        </span>
                    </span>
                `).join('');
            }

            // Update Table
            if (!isTickerOnly && tableBody) {
                // Clear loading on first run
                if(tableBody.querySelector('.loading-row')) tableBody.innerHTML = '';

                data.prices.forEach(item => {
                    const key = `${item.name}-${item.mandi}`;
                    const trendIcon = item.status === 'up' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';
                    const trendClass = item.status === 'up' ? 'trend-up' : 'trend-down';
                    
                    // Check if price changed for flashing effect
                    let flashClass = '';
                    if (previousPrices[key] && previousPrices[key] !== item.price) {
                        flashClass = item.price > previousPrices[key] ? 'flash-up' : 'flash-down';
                    }
                    previousPrices[key] = item.price;

                    let row = document.getElementById(`row-${key}`);
                    if (!row) {
                        row = document.createElement('tr');
                        row.id = `row-${key}`;
                        tableBody.appendChild(row);
                    }

                    row.className = flashClass;
                    row.innerHTML = `
                        <td><strong>${item.name}</strong></td>
                        <td>${item.mandi}</td>
                        <td style="color: var(--text-muted)">₹ ${item.min.toLocaleString()}</td>
                        <td style="color: var(--text-muted)">₹ ${item.max.toLocaleString()}</td>
                        <td style="font-weight: 600; color: var(--secondary)">₹ ${item.price.toLocaleString()}</td>
                        <td class="${trendClass}"><i class="fa-solid ${trendIcon}"></i> ${item.trend}</td>
                    `;
                });
            }
        }
    } catch (e) {
        console.error("Live update failed", e);
    }
};

// Start Auto-Updates
setInterval(() => window.loadMarketPrices(true), 5000); // Ticker background update
setInterval(() => {
    if(document.querySelector('#market-prices.active')) {
        window.loadMarketPrices(false); // Only update table if active
    }
}, 10000);

// Initial Load
document.addEventListener('DOMContentLoaded', () => {
    window.loadMarketPrices(true);
});

// --- Chart.js Configuration ---
let priceChart = null;

window.updateChart = async function() {
    const crop = document.getElementById('chartCropSelector').value;
    const ctx = document.getElementById('priceHistoryChart').getContext('2d');
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/historical-trends?crop=${crop}`);
        const data = await response.json();

        if (data.status === 'success') {
            if (priceChart) priceChart.destroy();
            
            priceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: `${crop} Price (₹/Quintal)`,
                        data: data.data,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 5,
                        pointBackgroundColor: '#10b981'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: { 
                            beginAtZero: false,
                            grid: { color: '#f3f4f6' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }
    } catch (e) {
        console.error("Chart load failed", e);
    }
};

// --- Feature Action Functions (Global Scope for inline onclick) ---

window.smartAnalyze = async function() {
    const loc = document.getElementById('crop_location')?.value;
    const loading = document.getElementById('cropLoading');
    const loadText = document.getElementById('loadingText');
    const resultBox = document.getElementById('cropResult');

    if (!loc || loc.length < 3) {
        window.showNotification("Please enter a valid district or enable location access", "error");
        return;
    }

    loading.style.display = 'block';
    loadText.innerText = "Fetching data for your location...";
    resultBox.innerHTML = `<div class="empty-state"><i class="fa-solid fa-satellite fa-spin"></i><p>Synchronizing with regional databases...</p></div>`;

    try {
        const response = await fetch(`${API_BASE_URL}/api/smart-recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location: loc })
        });
        const data = await response.json();
        
        if (data.status === 'success') {
            displayRecommendation(data);
            window.showNotification(`Data-driven analysis complete for ${loc}`, "success");
        } else {
            window.showNotification(data.message, "error");
            resultBox.innerHTML = `<div class="empty-state"><i class="fa-solid fa-circle-exclamation"></i><p>${data.message}</p></div>`;
        }
    } catch (e) {
        window.showNotification("Server error. Check your connection.", "error");
    } finally {
        loading.style.display = 'none';
    }
};

window.analyzeCrop = async function() {
    const locInput = document.getElementById('crop_location');
    const soilDropdown = document.getElementById('crop_soil_type');
    const loading = document.getElementById('cropLoading');
    const loadText = document.getElementById('loadingText');
    const resultBox = document.getElementById('cropResult');

    // If location is provided, try to auto-update soil first for better accuracy
    if (locInput?.value && locInput.value.length >= 3) {
        try {
            const soilRes = await fetch(`${API_BASE_URL}/api/get-soil-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ location: locInput.value })
            });
            const soilData = await soilRes.json();
            if (soilData.status === 'success' && soilDropdown) {
                soilDropdown.value = soilData.soil_type;
                window.showNotification(`Auto-synced soil for ${locInput.value}`, "info");
            }
        } catch (e) { /* Fallback to manual dropdown selection */ }
    }

    loading.style.display = 'block';
    loadText.innerText = "Analyzing manual parameters...";
    resultBox.innerHTML = `<div class="empty-state"><i class="fa-solid fa-microchip fa-spin"></i><p>Processing farm conditions...</p></div>`;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                soil_type: soilDropdown?.value,
                season: document.getElementById('crop_season')?.value,
                water: document.getElementById('crop_water')?.value,
                health: document.getElementById('crop_health')?.value,
                weather: document.getElementById('crop_weather')?.value,
                location: locInput?.value
            })
        });
        const data = await response.json();
        if(data.status === 'success') displayRecommendation(data);
    } catch (e) {
        resultBox.innerHTML = `<div class="error-msg"><i class="fa-solid fa-circle-exclamation"></i> Analysis failed.</div>`;
    } finally {
        loading.style.display = 'none';
    }
};

// Add Enter key support for Location field
document.getElementById('crop_location')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        window.smartAnalyze();
    }
});

function displayRecommendation(data) {
    const p = data.primary_crop;
    const alts = data.alternatives;
    const params = data.detected_params || {};
    const resultBox = document.getElementById('cropResult');
    
    resultBox.className = '';
    let html = `
        <div class="result-card primary-recommendation">
            <div class="accuracy-badge">${p.accuracy}% Match</div>
            <div class="voice-btn" onclick="window.speakResults('${p.name.split(' (')[0]}')">
                <i class="fa-solid fa-volume-high"></i> Listen
            </div>
            
            <span style="background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Top Choice 🌱</span>
            <h2 style="color: var(--secondary); margin: 10px 0 5px 0; font-size: 1.8rem;">${p.name}</h2>
            
            ${params.soil ? `<p style="font-size:0.85rem; color:var(--primary); font-weight:600; margin-bottom:10px;">Mapped: ${params.soil} | ${params.season} Season</p>` : ''}
            
            <p style="margin-bottom: 20px; font-style: italic; color: var(--text-muted); font-size: 1rem;">"${p.reasoning}"</p>
            
            <div class="result-info-grid">
                <div class="info-stat">
                    <i class="fa-solid fa-chart-line"></i>
                    <div>
                        <span class="label">Exp. Yield</span>
                        <span class="val">${p.expected_yield}</span>
                    </div>
                </div>
                <div class="info-stat">
                    <i class="fa-solid fa-indian-rupee-sign"></i>
                    <div>
                        <span class="label">Mandi Price</span>
                        <span class="val">₹ ${p.mandi_price}/q</span>
                    </div>
                </div>
            </div>

            <div class="expert-box">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                    <i class="fa-solid fa-user-doctor" style="color:var(--primary)"></i>
                    <strong style="color:var(--secondary)">Expert Advice:</strong>
                </div>
                <p>${p.expert_tip}</p>
            </div>

            <div class="alternatives-section">
                <h4 style="text-align:left; color:var(--secondary); margin-bottom:15px; display:flex; align-items:center; gap:8px;">
                    <i class="fa-solid fa-list-check"></i> Alternatives
                </h4>
                <div class="alt-grid">
    `;

    alts.forEach(alt => {
        html += `
            <div class="alt-card">
                <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
                    <span class="alt-accuracy">${alt.accuracy}%</span>
                </div>
                <h5 style="color:var(--secondary); font-size:1rem;">${alt.name.split(' (')[0]}</h5>
                <p style="font-size:0.75rem; color:var(--text-muted); margin-top:5px;">Yield: ${alt.expected_yield.split(' ')[0]} T/A</p>
            </div>
        `;
    });

    html += `
                </div>
            </div>
        </div>
    `;
    resultBox.innerHTML = html;
    window.showNotification("Best Crop Identified!", "success");
}

window.speakResults = function(text) {
    if ('speechSynthesis' in window) {
        const msg = new SpeechSynthesisUtterance();
        msg.text = `The best crop for your land is ${text}. Check the expert advice for more details.`;
        msg.rate = 0.9;
        window.speechSynthesis.speak(msg);
        window.showNotification("Reading results...", "info");
    } else {
        window.showNotification("Voice support not available in this browser", "error");
    }
};

window.predictYield = async function() {
    const resultBox = document.getElementById('yieldResult');
    const area = document.getElementById('yield_area').value;
    
    if(!area) return window.showNotification("Enter area", "error");

    resultBox.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><p>Calculating yield...</p>`;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area })
        });
        const data = await response.json();

        if(data.status === 'success') {
            resultBox.className = '';
            resultBox.innerHTML = `
                <div class="result-card" style="background:#FFFBF1; border-color:#F59E0B">
                    <i class="fa-solid fa-boxes-stacked" style="font-size: 2rem; color: #F59E0B; margin-bottom: 10px;"></i>
                    <h4 style="color: #D97706">Expected Yield: ${data.expected_yield}</h4>
                    <p>Estimated Profit: ${data.profit_est}</p>
                </div>
            `;
            window.showNotification("Yield Calculated", "info");
        }
    } catch (e) {
        resultBox.innerHTML = `<p style="color:red">Server Error</p>`;
    }
};

window.scanDisease = async function() {
    const btn = event.currentTarget;
    const fileInput = document.getElementById('diseaseImage');
    if(!fileInput.files[0]) return window.showNotification("Upload image", "error");

    btn.innerText = `Scanning...`;
    const resultBox = document.getElementById('diseaseResult');
    
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);

    try {
        const response = await fetch(`${API_BASE_URL}/api/detect`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if(data.status === 'success') {
            const d = data.detection;
            btn.innerText = `Scan Now`;
            
            // Format remedies as list items
            const remediesList = d.remedy.map(r => `<li>${r}</li>`).join('');
            
            resultBox.className = '';
            resultBox.innerHTML = `
                <div class="result-card" style="background:#FEF2F2; border-color:#EF4444">
                    <i class="fa-solid fa-virus" style="font-size: 2rem; color: #EF4444; margin-bottom: 10px;"></i>
                    <h4 style="color: #B91C1C">Detected: ${d.name}</h4>
                    <p><strong>Description:</strong> ${d.description}</p>
                    
                    <div style="text-align:left; background:white; padding:15px; border-radius:8px; margin-top:15px; border:1px solid #FECACA;">
                        <strong style="color:var(--secondary); font-size:0.9rem;">Recommended Solutions:</strong>
                        <ul style="margin-left:20px; font-size:0.85rem; color:var(--text-main); margin-top:5px;">
                            ${remediesList}
                        </ul>
                    </div>
                </div>
            `;
        }
    } catch (e) {
        btn.innerText = `Scan Now`;
    }
};
