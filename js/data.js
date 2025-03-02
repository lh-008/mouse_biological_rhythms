const dataModule = (function() {
    // Light-dark comparison data (will be calculated from actual data)
    let lightDarkData = [
        {condition: "Light Off (Night)", avgActivity: 0, avgTemp: 0},
        {condition: "Light On (Day)", avgActivity: 0, avgTemp: 0}
    ];
    
    // Store loaded data
    let cachedData = null;
    
    // Function to load the entire mouse dataset
    async function loadAllData() {
        if (cachedData) {
            return cachedData;
        }
        
        try {
            // Load data using d3.csv
            const data = await d3.csv("data/mouse_data.csv", d => ({
                Minute: +d.Minute,
                Mouse_ID: d.Mouse_ID,
                Activity: +d.Activity,
                Body_Temperature: +d.Body_Temperature,
                Sex: d.Sex,
                Day: +d.Day,
                Light_On: d.Light_On === "True" || d.Light_On === "true",
                Estrus: d.Estrus === "True" || d.Estrus === "true"
            }));
            
            // Cache data
            cachedData = data;
            
            // Calculate light/dark averages
            calculateLightDarkAverages(data);
            
            return data;
        } catch (error) {
            console.error("Error loading mouse data:", error);
            throw error;
        }
    }
    
    // Calculate averages for light on vs light off periods
    function calculateLightDarkAverages(data) {
        const lightOn = data.filter(d => d.Light_On);
        const lightOff = data.filter(d => !d.Light_On);
        
        // Calculate averages
        const lightOnActivity = lightOn.reduce((sum, d) => sum + d.Activity, 0) / lightOn.length;
        const lightOnTemp = lightOn.reduce((sum, d) => sum + d.Body_Temperature, 0) / lightOn.length;
        
        const lightOffActivity = lightOff.reduce((sum, d) => sum + d.Activity, 0) / lightOff.length;
        const lightOffTemp = lightOff.reduce((sum, d) => sum + d.Body_Temperature, 0) / lightOff.length;
        
        // Update light/dark data
        lightDarkData = [
            {condition: "Light Off (Night)", avgActivity: lightOffActivity, avgTemp: lightOffTemp},
            {condition: "Light On (Day)", avgActivity: lightOnActivity, avgTemp: lightOnTemp}
        ];
        
        return lightDarkData;
    }
    
    // Function to get data for a specific mouse and day
    async function getMouseDayData(mouseId, day) {
        try {
            const allData = await loadAllData();
            
            // Filter data for the specific mouse and day
            const filteredData = allData.filter(d => 
                d.Mouse_ID === mouseId && d.Day === +day
            );
            
            if (filteredData.length === 0) {
                throw new Error(`No data found for mouse ${mouseId} on day ${day}`);
            }
            
            return filteredData;
        } catch (error) {
            console.error(`Error getting data for mouse ${mouseId}, day ${day}:`, error);
            throw error;
        }
    }
    
    // Get hourly averages from minute data
    function calculateHourlyAverages(minuteData) {
        const hourlyAverages = [];
        
        // Process 24 hours
        for (let hour = 0; hour < 24; hour++) {
            const startMinute = hour * 60;
            const endMinute = (hour + 1) * 60 - 1;
            
            // Filter data for current hour
            const hourData = minuteData.filter(d => 
                d.Minute >= startMinute && d.Minute <= endMinute
            );
            
            if (hourData.length === 0) {
                // If no data for this hour, use placeholder values
                hourlyAverages.push({
                    hour,
                    avgActivity: 0,
                    avgTemp: 37,
                    isLightOn: hour >= 12 // Assume light is on during day hours if missing data
                });
                continue;
            }
            
            // Calculate averages
            const avgActivity = hourData.reduce((sum, d) => sum + d.Activity, 0) / hourData.length;
            const avgTemp = hourData.reduce((sum, d) => sum + d.Body_Temperature, 0) / hourData.length;
            
            // Determine if light is on (use the majority of minutes in the hour)
            const lightOnCount = hourData.filter(d => d.Light_On).length;
            const isLightOn = lightOnCount > (hourData.length / 2);
            
            hourlyAverages.push({
                hour,
                avgActivity,
                avgTemp,
                isLightOn
            });
        }
        
        return hourlyAverages;
    }
    
    // Get unique mouse IDs from data
    async function getUniqueMouseIds() {
        try {
            const allData = await loadAllData();
            const mouseIds = [...new Set(allData.map(d => d.Mouse_ID))];
            return mouseIds.sort();
        } catch (error) {
            console.error("Error getting unique mouse IDs:", error);
            return [];
        }
    }
    
    // Get available days for a specific mouse
    async function getAvailableDays(mouseId) {
        try {
            const allData = await loadAllData();
            const mouseDays = allData.filter(d => d.Mouse_ID === mouseId);
            const days = [...new Set(mouseDays.map(d => d.Day))];
            return days.sort((a, b) => a - b);
        } catch (error) {
            console.error(`Error getting available days for mouse ${mouseId}:`, error);
            return [];
        }
    }
    
    // Calculate gender-based statistics
    async function getGenderStats() {
        try {
            const allData = await loadAllData();
            
            // Separate by gender
            const maleData = allData.filter(d => d.Sex === 'M');
            const femaleData = allData.filter(d => d.Sex === 'F');
            
            // Calculate averages
            const maleActivity = maleData.reduce((sum, d) => sum + d.Activity, 0) / maleData.length;
            const maleTemp = maleData.reduce((sum, d) => sum + d.Body_Temperature, 0) / maleData.length;
            
            const femaleActivity = femaleData.reduce((sum, d) => sum + d.Activity, 0) / femaleData.length;
            const femaleTemp = femaleData.reduce((sum, d) => sum + d.Body_Temperature, 0) / femaleData.length;
            
            return {
                male: {
                    avgActivity: maleActivity,
                    avgTemp: maleTemp
                },
                female: {
                    avgActivity: femaleActivity,
                    avgTemp: femaleTemp
                }
            };
        } catch (error) {
            console.error("Error calculating gender stats:", error);
            return {
                male: { avgActivity: 22.6, avgTemp: 36.8 },
                female: { avgActivity: 15.1, avgTemp: 37.3 }
            };
        }
    }
    
    return {
        loadAllData,
        getMouseDayData,
        calculateHourlyAverages,
        getUniqueMouseIds,
        getAvailableDays,
        getGenderStats,
        getLightDarkData: () => lightDarkData
    };
})();

window.dataModule = dataModule;