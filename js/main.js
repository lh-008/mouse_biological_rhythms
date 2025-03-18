(function() {
    // Current state
    let currentMouseId = 'f1';
    let currentDay = 1;
    
    const mouseSelect = document.getElementById('mouseSelect');
    const daySelect = document.getElementById('daySelect');
    
    async function init() {
        try {    
        window.mouseSimulation.init();
        
        // Preload data
        await window.dataModule.loadAllData();
        
        // Update mouse selection dropdown with available mice
        await populateMouseDropdown();
        
        // Update day selection dropdown with available days
        await populateDayDropdown(currentMouseId);
        
        // Update gender stats
        await window.chartsModule.updateGenderCards();
        
        // Create light/dark comparison charts
        window.chartsModule.createLightDarkCharts();
        
        // Initialize estrus cycle visualization
        initEstrusVisualization();
        
        // Initialize mouse comparison module if available
        if (window.mouseComparisonModule) {
            window.mouseComparisonModule.init();
        }
        
        // Initial data load for visualization
        await loadData(currentMouseId, currentDay);
        
        // Set up event listeners
        setupEventListeners();
        
        // Handle window resize
        window.addEventListener('resize', handleResize);
        
        // Hide loading message
        showLoading(false);
    } catch (error) {
        console.error("Error initializing application:", error);
        showLoading(false);
        showError("Error loading data. Please try refreshing the page.");
    }
}
    
    // Set up event listeners for controls
    function setupEventListeners() {
        // Mouse selection
        mouseSelect.addEventListener('change', async function() {
            currentMouseId = this.value;
            await populateDayDropdown(currentMouseId);
            loadData(currentMouseId, currentDay);
        });
        
        // Day selection
        daySelect.addEventListener('change', function() {
            currentDay = this.value;
            loadData(currentMouseId, currentDay);
        });
    }
    
    // Load data for the selected mouse and day
    async function loadData(mouseId, day) {
        try {
            // Show loading indicator
            showLoading(true, "Updating visualization...");
            
            // Update charts with selected mouse data
            const hourlyData = await window.chartsModule.updateCharts(mouseId, day);
            
            // Update mouse simulation with new data
            window.mouseSimulation.updateData(hourlyData);
            
            // Hide loading indicator
            showLoading(false);
        } catch (error) {
            console.error("Error loading data:", error);
            showLoading(false);
            showError(`Error loading data for mouse ${mouseId}, day ${day}`);
        }
    }
    
    // Populate the mouse selection dropdown
    async function populateMouseDropdown() {
        try {
            // Get unique mouse IDs
            const mouseIds = await window.dataModule.getUniqueMouseIds();
            
            // Clear dropdown
            mouseSelect.innerHTML = '';
            
            // Helper function to sort mouse IDs numerically
            const sortMouseIds = (ids) => {
                return ids.sort((a, b) => {
                    // Extract the numeric part after the first character (f or m)
                    const numA = parseInt(a.substring(1));
                    const numB = parseInt(b.substring(1));
                    return numA - numB;
                });
            };
            
            // Add female mice first (sorted numerically)
            const femaleMice = sortMouseIds(mouseIds.filter(id => id.startsWith('f')));
            femaleMice.forEach(id => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `Female Mouse ${id.substring(1)}`;
                mouseSelect.appendChild(option);
            });
            
            // Add male mice (sorted numerically)
            const maleMice = sortMouseIds(mouseIds.filter(id => id.startsWith('m')));
            maleMice.forEach(id => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `Male Mouse ${id.substring(1)}`;
                mouseSelect.appendChild(option);
            });
            
            // Set default selection
            mouseSelect.value = currentMouseId;
        } catch (error) {
            console.error("Error populating mouse dropdown:", error);
            
            // Add default options if loading fails
            mouseSelect.innerHTML = `
                <option value="f1">Female Mouse 1</option>
                <option value="f2">Female Mouse 2</option>
                <option value="m1">Male Mouse 1</option>
                <option value="m2">Male Mouse 2</option>
            `;
        }
    }
    
    async function populateDayDropdown(mouseId) {
        try {
            // Get available days for the selected mouse
            const days = await window.dataModule.getAvailableDays(mouseId);
            
            // Clear dropdown
            daySelect.innerHTML = '';
            
            // Add days
            days.forEach(day => {
                const option = document.createElement('option');
                option.value = day;
                option.textContent = `Day ${day}`;
                daySelect.appendChild(option);
            });
            
            // Set default selection to first day if available, otherwise keep current day
            if (days.includes(parseInt(currentDay))) {
                daySelect.value = currentDay;
            } else if (days.length > 0) {
                currentDay = days[0];
                daySelect.value = currentDay;
            }
        } catch (error) {
            console.error("Error populating day dropdown:", error);
            
            // Add default options if loading fails
            daySelect.innerHTML = `
                <option value="1">Day 1</option>
                <option value="2">Day 2</option>
                <option value="3">Day 3</option>
            `;
        }
    }
    
    // Initialize estrus cycle visualization
    function initEstrusVisualization() {
        // Add these new event listeners for the filter buttons
        const bothDataBtn = document.getElementById('bothDataBtn');
        const estrusOnlyBtn = document.getElementById('estrusOnlyBtn');
        const nonEstrusOnlyBtn = document.getElementById('nonEstrusOnlyBtn');

        if (bothDataBtn && estrusOnlyBtn && nonEstrusOnlyBtn) {
            bothDataBtn.addEventListener('click', function() {
            // Update active button state
            bothDataBtn.classList.add('active');
            estrusOnlyBtn.classList.remove('active');
            nonEstrusOnlyBtn.classList.remove('active');
        
            // Update chart with filter
            window.estrusModule.updateDataFilter('both');
        });
    
        estrusOnlyBtn.addEventListener('click', function() {
            // Update active button state
            estrusOnlyBtn.classList.add('active');
            bothDataBtn.classList.remove('active');
            nonEstrusOnlyBtn.classList.remove('active');
        
            // Update chart with filter
            window.estrusModule.updateDataFilter('estrus');
        });
    
        nonEstrusOnlyBtn.addEventListener('click', function() {
            // Update active button state
            nonEstrusOnlyBtn.classList.add('active');
            bothDataBtn.classList.remove('active');
            estrusOnlyBtn.classList.remove('active');
        
            // Update chart with filter
            window.estrusModule.updateDataFilter('nonEstrus');
        });
        }
        try {
            // Initialize charts
            window.estrusModule.createEstrusComparisonChart('activity');
            window.estrusModule.createEstrusBarCharts();
            
            // Setup event listeners for the mode buttons
            const activityBtn = document.getElementById('activityModeBtn');
            const tempBtn = document.getElementById('temperatureModeBtn');
            
            if (activityBtn && tempBtn) {
                activityBtn.addEventListener('click', function() {
                    activityBtn.classList.add('active');
                    tempBtn.classList.remove('active');
                    window.estrusModule.updateEstrusChartType('activity');
                });
                
                tempBtn.addEventListener('click', function() {
                    tempBtn.classList.add('active');
                    activityBtn.classList.remove('active');
                    window.estrusModule.updateEstrusChartType('temperature');
                });
            }
        } catch (error) {
            console.error("Error initializing estrus visualization:", error);
        }
    }
    
    // Handle window resize
    function handleResize() {
        // Redraw charts when window is resized
        window.chartsModule.createSeparateCharts();
        window.chartsModule.createLightDarkCharts();
    
        // Redraw estrus charts
        const activeBtn = document.querySelector('.mode-btn.active');
        const dataType = activeBtn && activeBtn.id === 'temperatureModeBtn' ? 'temperature' : 'activity';
    
        window.estrusModule.createEstrusComparisonChart(dataType);
        window.estrusModule.createEstrusBarCharts();
    
        // Redraw comparison charts if they're visible
        if (document.getElementById('comparisonCharts') && 
            document.getElementById('comparisonCharts').style.display !== 'none') {
            // Trigger compare button click to refresh charts
            const compareButton = document.getElementById('compareButton');
            if (compareButton) {
                compareButton.click();
            }
        }
    }
    
    // Show/hide loading indicator
    function showLoading(show, message = "Loading...") {
        // Create loading element if it doesn't exist
        let loadingEl = document.getElementById('loadingIndicator');
        if (!loadingEl) {
            loadingEl = document.createElement('div');
            loadingEl.id = 'loadingIndicator';
            loadingEl.className = 'loading-indicator';
            document.body.appendChild(loadingEl);
            
            // Apply styles
            loadingEl.style.position = 'fixed';
            loadingEl.style.top = '50%';
            loadingEl.style.left = '50%';
            loadingEl.style.transform = 'translate(-50%, -50%)';
            loadingEl.style.padding = '15px 20px';
            loadingEl.style.background = 'rgba(0, 0, 0, 0.7)';
            loadingEl.style.color = 'white';
            loadingEl.style.borderRadius = '5px';
            loadingEl.style.zIndex = '1000';
            loadingEl.style.display = 'none';
        }
        
        // Update content and visibility
        loadingEl.textContent = message;
        loadingEl.style.display = show ? 'block' : 'none';
        
        // Change cursor
        document.body.style.cursor = show ? 'wait' : 'default';
    }
    
    // Show error message
    function showError(message) {
        // Create error element if it doesn't exist
        let errorEl = document.getElementById('errorMessage');
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.id = 'errorMessage';
            errorEl.className = 'error-message';
            
            // Insert at top of page
            document.body.insertBefore(errorEl, document.body.firstChild);
            
            // Apply styles
            errorEl.style.backgroundColor = '#f8d7da';
            errorEl.style.color = '#721c24';
            errorEl.style.padding = '10px 15px';
            errorEl.style.margin = '10px 0';
            errorEl.style.borderRadius = '4px';
            errorEl.style.textAlign = 'center';
            errorEl.style.fontWeight = 'bold';
        }
        
        errorEl.textContent = message;
        
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    }
    
    document.addEventListener('DOMContentLoaded', init);
})();