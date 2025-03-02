const mouseSimulation = (function() {
    // DOM elements
    let slider, timeDisplay, lightIcon, lightStatus, activityLevel, bodyTempValue, mouseTemp;
    let currentData = [];
    
    // Initialize the simulation
    function init() {
        // Get DOM elements
        slider = document.getElementById('timeSlider');
        timeDisplay = document.getElementById('timeDisplay');
        lightIcon = document.getElementById('lightIcon');
        lightStatus = document.getElementById('lightStatus');
        activityLevel = document.getElementById('activityLevel');
        bodyTempValue = document.getElementById('bodyTempValue');
        mouseTemp = document.getElementById('mouseTemp');
        
        // Set up event listeners
        setupTimeSlider();
    }
    
    // Set up time slider functionality
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
        
        // If no data available, show default values
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
        
        // Update light indicator
        if (hourData.isLightOn) {
            lightIcon.className = 'light-icon light-on';
            lightStatus.textContent = 'Light is ON';
        } else {
            lightIcon.className = 'light-icon light-off';
            lightStatus.textContent = 'Light is OFF';
        }
        
        // Calculate a percentage of activity for the meter (max activity is around 40)
        const activityPercentage = Math.min(100, (hourData.avgActivity / 40) * 100);
        activityLevel.style.width = `${activityPercentage}%`;
        
        // Update temperature display
        bodyTempValue.textContent = `${hourData.avgTemp.toFixed(1)}°C`;
        
        // Update mouse temperature visualization
        const tempNormalized = (hourData.avgTemp - 35.5) / 3.5; // Normalize between 0 and 1
        mouseTemp.style.opacity = 0.1 + tempNormalized * 0.7;
    }
    
    // Update the simulation with new data
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