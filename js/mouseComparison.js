const mouseComparisonModule = (function() {
    // DOM elements
    let femaleMouseSelect, maleMouseSelect, comparisonDaySelect, compareButton;
    let comparisonCharts, comparisonMessage;
    
    // Store data for comparison
    let femaleMouseData = null;
    let maleMouseData = null;
    
    // Color scheme
    const femaleColor = "#e74c3c";  // Red for female
    const maleColor = "#3498db";    // Blue for male
    const lightOnColor = "#FFFAEB"; // Light period
    const lightOffColor = "#EAEEF2"; // Dark period
    
    // Initialize comparison module
    function init() {
        // Get DOM elements
        femaleMouseSelect = document.getElementById('femaleMouseSelect');
        maleMouseSelect = document.getElementById('maleMouseSelect');
        comparisonDaySelect = document.getElementById('comparisonDaySelect');
        compareButton = document.getElementById('compareButton');
        comparisonCharts = document.getElementById('comparisonCharts');
        comparisonMessage = document.getElementById('comparisonMessage');
        
        if (!femaleMouseSelect || !maleMouseSelect || !comparisonDaySelect || !compareButton) {
            console.error("Comparison elements not found");
            return;
        }
        
        // Populate dropdowns
        populateMouseDropdowns();
        
        // Set up event listeners
        setupEventListeners();
    }
    
    // Populate mouse selection dropdowns
    async function populateMouseDropdowns() {
        try {
            // Get all mouse IDs
            const mouseIds = await window.dataModule.getUniqueMouseIds();
            
            // Clear dropdowns
            femaleMouseSelect.innerHTML = '';
            maleMouseSelect.innerHTML = '';
            
            // Separate mice by gender and sort numerically
            const femaleMice = mouseIds.filter(id => id.startsWith('f')).sort((a, b) => {
                // Extract numeric part and compare as numbers
                const numA = parseInt(a.substring(1));
                const numB = parseInt(b.substring(1));
                return numA - numB;
            });
            
            const maleMice = mouseIds.filter(id => id.startsWith('m')).sort((a, b) => {
                // Extract numeric part and compare as numbers
                const numA = parseInt(a.substring(1));
                const numB = parseInt(b.substring(1));
                return numA - numB;
            });
            
            // Populate female dropdown
            femaleMice.forEach(id => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `Female Mouse ${id.substring(1)}`;
                femaleMouseSelect.appendChild(option);
            });
            
            // Populate male dropdown
            maleMice.forEach(id => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `Male Mouse ${id.substring(1)}`;
                maleMouseSelect.appendChild(option);
            });
            
            // Update day dropdown based on initial selections
            if (femaleMice.length > 0 && maleMice.length > 0) {
                updateComparisonDays(femaleMice[0], maleMice[0]);
            }
        } catch (error) {
            console.error("Error populating mouse dropdowns:", error);
            comparisonMessage.textContent = "Error loading mouse data. Please refresh the page.";
        }
    }
    
    // Set up event listeners
    function setupEventListeners() {
        // Mouse selection change events
        femaleMouseSelect.addEventListener('change', function() {
            updateComparisonDays(this.value, maleMouseSelect.value);
        });
        
        maleMouseSelect.addEventListener('change', function() {
            updateComparisonDays(femaleMouseSelect.value, this.value);
        });
        
        // Compare button click - Ensure we clear any prior chart data and properly reset display
        compareButton.addEventListener('click', function() {
            // Show loading state
            comparisonMessage.style.display = 'block';
            comparisonMessage.textContent = "Loading...";
            
            // Clear any previous charts
            if (comparisonCharts) {
                comparisonCharts.style.display = 'none';
                d3.select("#activityComparisonChart").html("");
                d3.select("#temperatureComparisonChart").html("");
            }
            
            const femaleMouseId = femaleMouseSelect.value;
            const maleMouseId = maleMouseSelect.value;
            const day = comparisonDaySelect.value;
            
            if (femaleMouseId && maleMouseId && day) {
                // Use setTimeout to ensure DOM updates before starting heavy computation
                setTimeout(() => {
                    compareMice(femaleMouseId, maleMouseId, day);
                }, 50);
            } else {
                comparisonMessage.textContent = "Please select both mice and a day to compare.";
            }
        });
    }
    
    // Update comparison day dropdown based on selected mice
    async function updateComparisonDays(femaleMouseId, maleMouseId) {
        try {
            // Get available days for both mice
            const femaleDays = await window.dataModule.getAvailableDays(femaleMouseId);
            const maleDays = await window.dataModule.getAvailableDays(maleMouseId);
            
            // Find common days
            const commonDays = femaleDays.filter(day => maleDays.includes(day)).sort((a, b) => a - b);
            
            // Clear day dropdown
            comparisonDaySelect.innerHTML = '';
            
            // Populate day dropdown with common days
            if (commonDays.length > 0) {
                commonDays.forEach(day => {
                    const option = document.createElement('option');
                    option.value = day;
                    option.textContent = `Day ${day}`;
                    comparisonDaySelect.appendChild(option);
                });
                
                comparisonMessage.textContent = "Select mice and a day, then click \"Compare Mice\" to view the comparison.";
            } else {
                comparisonMessage.textContent = "No common days available for these mice.";
            }
        } catch (error) {
            console.error("Error updating comparison days:", error);
            comparisonMessage.textContent = "Error finding common days for selected mice.";
        }
    }
    
    // Compare selected mice data
    async function compareMice(femaleMouseId, maleMouseId, day) {
        try {
            // Get data for both mice
            femaleMouseData = await window.dataModule.getMouseDayData(femaleMouseId, day);
            maleMouseData = await window.dataModule.getMouseDayData(maleMouseId, day);
            
            if (!femaleMouseData || !maleMouseData || femaleMouseData.length === 0 || maleMouseData.length === 0) {
                throw new Error("Failed to load data for one or both mice");
            }
            
            // Process data into hourly averages
            const femaleHourlyData = window.dataModule.calculateHourlyAverages(femaleMouseData);
            const maleHourlyData = window.dataModule.calculateHourlyAverages(maleMouseData);
            
            // Create comparison charts
            createComparisonCharts(femaleHourlyData, maleHourlyData, femaleMouseId, maleMouseId);
            
            // Show charts and hide message
            comparisonCharts.style.display = 'block';
            comparisonMessage.style.display = 'none';
        } catch (error) {
            console.error("Error comparing mice:", error);
            comparisonMessage.style.display = 'block';
            comparisonMessage.textContent = "Error loading comparison data. Please try again.";
            comparisonCharts.style.display = 'none';
        }
    }
    
    // Create comparison charts for activity and temperature
    function createComparisonCharts(femaleHourlyData, maleHourlyData, femaleId, maleId) {
        // Clear previous charts
        d3.select("#activityComparisonChart").html("");
        d3.select("#temperatureComparisonChart").html("");
        
        // Create activity comparison chart
        createComparisonChart({
            femaleData: femaleHourlyData,
            maleData: maleHourlyData,
            containerId: 'activityComparisonChart',
            title: `Activity Comparison: ${femaleId.toUpperCase()} vs ${maleId.toUpperCase()}`,
            yAxisLabel: 'Activity Level',
            dataKey: 'avgActivity',
            femaleColor: femaleColor,
            maleColor: maleColor,
            height: 350
        });
        
        // Create temperature comparison chart
        createComparisonChart({
            femaleData: femaleHourlyData,
            maleData: maleHourlyData,
            containerId: 'temperatureComparisonChart',
            title: `Temperature Comparison: ${femaleId.toUpperCase()} vs ${maleId.toUpperCase()}`,
            yAxisLabel: 'Body Temperature (°C)',
            dataKey: 'avgTemp',
            femaleColor: femaleColor,
            maleColor: maleColor,
            height: 350,
            yAxisConfig: {
                min: 35.0,
                max: 39.0,
                padding: 0.1
            }
        });
    }
    
    // Create a single comparison chart
    function createComparisonChart(config) {
        const {
            femaleData,
            maleData,
            containerId,
            title,
            yAxisLabel,
            dataKey,
            femaleColor,
            maleColor,
            height = 350,
            yAxisConfig = null
        } = config;
        
        // Ensure container exists
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`Container #${containerId} not found`);
            return;
        }
        
        const margin = {top: 50, right: 150, bottom: 60, left: 60};
        const width = container.clientWidth - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;
        
        const svg = d3.select("#" + containerId)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        
        // Add chart title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text(title);
        
        // X scale
        const x = d3.scaleLinear()
            .domain([0, 23])
            .range([0, width]);
        
        // Y scale
        let yRange;
        if (yAxisConfig) {
            yRange = [yAxisConfig.min, yAxisConfig.max];
        } else {
            // Get all values from both datasets
            const allValues = [
                ...femaleData.map(d => d[dataKey]),
                ...maleData.map(d => d[dataKey])
            ];
            
            const dataMin = d3.min(allValues);
            const dataMax = d3.max(allValues);
            
            // Calculate padding
            const range = dataMax - dataMin;
            const padding = range * 0.1;
            
            // Set range with padding
            yRange = [
                dataKey === 'avgActivity' ? 0 : Math.max(35, dataMin - padding), 
                dataKey === 'avgActivity' ? (dataMax + padding) * 1.1 : Math.min(39, dataMax + padding)
            ];
        }
        
        const y = d3.scaleLinear()
            .domain(yRange)
            .range([chartHeight, 0]);
        
        // Add backgrounds to indicate light/dark periods
        femaleData.forEach((d, i) => {
            if (i < femaleData.length - 1) {
                svg.append("rect")
                    .attr("x", x(d.hour))
                    .attr("width", x(d.hour + 1) - x(d.hour))
                    .attr("y", 0)
                    .attr("height", chartHeight)
                    .attr("fill", d.isLightOn ? lightOnColor : lightOffColor)
                    .attr("opacity", 0.7);
            }
        });
        
        // Add gridlines
        svg.append("g")
            .attr("class", "grid")
            .attr("transform", `translate(0,${chartHeight})`)
            .style("stroke-dasharray", "3 3")
            .style("opacity", 0.3)
            .call(d3.axisBottom(x)
                .tickSize(-chartHeight)
                .tickFormat("")
            );
        
        svg.append("g")
            .attr("class", "grid")
            .style("stroke-dasharray", "3 3")
            .style("opacity", 0.3)
            .call(d3.axisLeft(y)
                .tickSize(-width)
                .tickFormat("")
            );
        
        // Add X axis
        svg.append("g")
            .attr("transform", `translate(0,${chartHeight})`)
            .call(d3.axisBottom(x).tickFormat(d => `${d}:00`))
            .selectAll("text")
            .style("text-anchor", "middle")
            .style("font-size", "11px");
        
        // Add X axis label
        svg.append("text")
            .attr("transform", `translate(${width/2}, ${chartHeight + margin.bottom - 10})`)
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Hour of Day");
        
        // Add Y axis
        svg.append("g")
            .call(d3.axisLeft(y))
            .selectAll("text")
            .style("font-size", "11px");
        
        // Add Y axis label
        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -margin.left + 15)
            .attr("x", -chartHeight/2)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text(yAxisLabel);
        
        // Create tooltip if it doesn't exist
        let tooltip = d3.select("body").select(".tooltip");
        if (tooltip.empty()) {
            tooltip = d3.select("body")
                .append("div")
                .attr("class", "tooltip")
                .style("opacity", 0)
                .style("position", "absolute")
                .style("background-color", "rgba(255, 255, 255, 0.9)")
                .style("border", "1px solid #ddd")
                .style("padding", "10px")
                .style("border-radius", "4px")
                .style("pointer-events", "none")
                .style("font-size", "0.9rem")
                .style("box-shadow", "0 2px 5px rgba(0,0,0,0.1)");
        }
        
        // If comparing mice, add both lines
        if (maleData && femaleData) {
            // Add female line
            addLineWithPoints(svg, femaleData, x, y, dataKey, femaleColor, 'female', tooltip);
            
            // Add male line
            addLineWithPoints(svg, maleData, x, y, dataKey, maleColor, 'male', tooltip);
        } else {
            // Add single line for individual mouse (fallback)
            addLineWithPoints(svg, femaleData || maleData, x, y, dataKey, '#4682B4', 'activity', tooltip);
        }
        
        // Add legend box
        const legendBox = svg.append("g")
            .attr("class", "chart-legend")
            .attr("transform", `translate(${width + 20}, 10)`);
        
        // Add legend background
        legendBox.append("rect")
            .attr("width", 120)
            .attr("height", 125)
            .attr("fill", "white")
            .attr("opacity", 0.8)
            .attr("rx", 4)
            .attr("ry", 4)
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1);
        
        // Add legend items
        if (maleData && femaleData) {
            // Male mouse legend item
            legendBox.append("line")
                .attr("x1", 10)
                .attr("y1", 25)
                .attr("x2", 30)
                .attr("y2", 25)
                .attr("stroke", maleColor)
                .attr("stroke-width", 2);
                
            legendBox.append("circle")
                .attr("cx", 20)
                .attr("cy", 25)
                .attr("r", 4)
                .attr("fill", maleColor);
                
            legendBox.append("text")
                .attr("x", 40)
                .attr("y", 28)
                .text("Male Mouse")
                .style("font-size", "12px");
            
            // Female mouse legend item    
            legendBox.append("line")
                .attr("x1", 10)
                .attr("y1", 50)
                .attr("x2", 30)
                .attr("y2", 50)
                .attr("stroke", femaleColor)
                .attr("stroke-width", 2);
                
            legendBox.append("circle")
                .attr("cx", 20)
                .attr("cy", 50)
                .attr("r", 4)
                .attr("fill", femaleColor);
                
            legendBox.append("text")
                .attr("x", 40)
                .attr("y", 53)
                .text("Female Mouse")
                .style("font-size", "12px");
        } else {
            // Single activity line for individual mouse
            legendBox.append("line")
                .attr("x1", 10)
                .attr("y1", 25)
                .attr("x2", 30)
                .attr("y2", 25)
                .attr("stroke", "#4682B4")
                .attr("stroke-width", 2);
                
            legendBox.append("circle")
                .attr("cx", 20)
                .attr("cy", 25)
                .attr("r", 4)
                .attr("fill", "#4682B4");
                
            legendBox.append("text")
                .attr("x", 40)
                .attr("y", 28)
                .text("Activity")
                .style("font-size", "12px");
        }
        
        // Light on/off legend items
        legendBox.append("rect")
            .attr("x", 10)
            .attr("y", 70)
            .attr("width", 20)
            .attr("height", 15)
            .attr("fill", lightOnColor)
            .attr("stroke", "#ddd")
            .attr("stroke-width", 0.5);
            
        legendBox.append("text")
            .attr("x", 40)
            .attr("y", 82)
            .text("Light On")
            .style("font-size", "12px");
            
        legendBox.append("rect")
            .attr("x", 10)
            .attr("y", 95)
            .attr("width", 20)
            .attr("height", 15)
            .attr("fill", lightOffColor)
            .attr("stroke", "#ddd")
            .attr("stroke-width", 0.5);
            
        legendBox.append("text")
            .attr("x", 40)
            .attr("y", 107)
            .text("Light Off")
            .style("font-size", "12px");
    }
    
    // Helper function to add a line with points
    function addLineWithPoints(svg, data, x, y, dataKey, color, className, tooltip) {
        // Add line with smoother curve
        svg.append("path")
            .datum(data)
            .attr("class", `${className}-line`)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 3.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", d3.line()
                .curve(d3.curveMonotoneX)
                .x(d => x(d.hour))
                .y(d => y(d[dataKey]))
            );
        
        // Add data points
        svg.selectAll(`.${className}-point`)
            .data(data)
            .enter()
            .append("circle")
            .attr("class", `${className}-point`)
            .attr("cx", d => x(d.hour))
            .attr("cy", d => y(d[dataKey]))
            .attr("r", 6)
            .attr("fill", color)
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("r", 8);
                    
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 1);
                    
                const valueDisplay = dataKey === 'avgTemp' ? 
                    `${d[dataKey].toFixed(2)}°C` : 
                    d[dataKey].toFixed(1);
                    
                tooltip.html(`<strong>Hour:</strong> ${d.hour}:00<br>
                            <strong>${className === 'female' ? 'Female' : 'Male'} ${dataKey === 'avgTemp' ? 'Temperature' : 'Activity'}:</strong> ${valueDisplay}<br>
                            <strong>Light:</strong> ${d.isLightOn ? 'On' : 'Off'}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(500)
                    .attr("r", 6);
                    
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    }
    
    return {
        init,
        compareMice
    };
})();

// Initialize the module when the document is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.mouseComparisonModule = mouseComparisonModule;
    
    // Initialize with a slight delay to ensure all other modules are loaded
    setTimeout(() => {
        if (window.dataModule) {
            mouseComparisonModule.init();
        } else {
            console.error("dataModule not available when initializing mouseComparisonModule");
        }
    }, 500);
});