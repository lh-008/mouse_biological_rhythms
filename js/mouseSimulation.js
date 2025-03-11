const mouseSimulation = (function() {
    // DOM elements
    let slider, timeDisplay, lightIcon, lightStatus, activityLevel, bodyTempValue, mouseTemp;
    let currentData = [];
    
    function init() {
        slider = document.getElementById('timeSlider');
        timeDisplay = document.getElementById('timeDisplay');
        lightIcon = document.getElementById('lightIcon');
        lightStatus = document.getElementById('lightStatus');
        activityLevel = document.getElementById('activityLevel');
        bodyTempValue = document.getElementById('bodyTempValue');
        mouseTemp = document.getElementById('mouseTemp');
        
        setupTimeSlider();
    }
    
    // Time slider functionality
    function setupTimeSlider() {
        slider.addEventListener('input', function() {
            updateSimulation(parseInt(this.value));
        });
        
        // Initialize with starting values
        slider.value = 0;
        updateSimulation(0);
    }
    
    // Update the simulation based on the current minute
    function updateSimulation(minute) {
        const hour = Math.floor(minute / 60);
        const min = minute % 60;
        
        // Update time display
        timeDisplay.textContent = `Time: ${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        
        // Get current data
        currentData = window.chartsModule.getCurrentData();
        
        // Default values if no data
        if (!currentData || currentData.length === 0) {
            lightIcon.className = 'light-icon light-off';
            lightStatus.textContent = 'Light is OFF';
            activityLevel.style.width = '20%';
            bodyTempValue.textContent = '37.0°C';
            mouseTemp.style.opacity = 0.5;
            return;
        }
        
        // Get data for current hour
        const hourData = currentData[hour];
        
        // Light indicator
        if (hourData.isLightOn) {
            lightIcon.className = 'light-icon light-on';
            lightStatus.textContent = 'Light is ON';
        } else {
            lightIcon.className = 'light-icon light-off';
            lightStatus.textContent = 'Light is OFF';
        }
        
        // Find the maximum activity value in the current data set
        const maxCurrentActivity = Math.max(...currentData.map(d => d.avgActivity));
        let activityPercentage;
        if (maxCurrentActivity <= 0) {
            activityPercentage = 0;
        } else {
            activityPercentage = (hourData.avgActivity / maxCurrentActivity) * 100;
        }
        
        const displayPercentage = hourData.avgActivity > 0 && activityPercentage < 5 ? 5 : activityPercentage;
        activityLevel.style.transition = 'width 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
        activityLevel.style.width = `${displayPercentage}%`;
        
        bodyTempValue.textContent = `${hourData.avgTemp.toFixed(1)}°C`;
        
        // Update mouse temperature visualization
        const tempNormalized = (hourData.avgTemp - 35.5) / 3.5;
        mouseTemp.style.opacity = 0.1 + tempNormalized * 0.7;
        
        // Update color of activity based on level
        if (activityPercentage > 70) {
            activityLevel.style.background = 'linear-gradient(to right, #3498db, #e74c3c)'; // High activity
        } else if (activityPercentage > 30) {
            activityLevel.style.background = 'linear-gradient(to right, #3498db, #2ecc71)'; // Medium activity
        } else {
            activityLevel.style.background = 'linear-gradient(to right, #3498db, #3498db)'; // Low activity
        }
    }
    
    function updateData(newData) {
        if (newData && newData.length > 0) {
            updateSimulation(parseInt(slider.value));
        }
    }
    
    return {
        init,
        updateData,
        updateSimulation
    };
})();

window.mouseSimulation = mouseSimulation;