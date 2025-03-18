const chartsModule = (function() {
    // Initialize tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("background-color", "rgba(255, 255, 255, 0.95)")
        .style("border", "1px solid #ddd")
        .style("border-radius", "5px")
        .style("padding", "10px")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.15)");
    
    // color scheme
    const activityColor = "#4682B4";    // Steel blue for activity
    const tempColor = "#E67E22";        // Softer orange for temperature
    const lightOnColor = "#FFFAEB";     // Warm light color for light periods
    const lightOffColor = "#EAEEF2";    // Subtle gray for dark periods
    
    // Store current hourly data
    let currentHourlyData = [];
    
    // Function to create separate activity and temperature charts
    function createSeparateCharts(hourlyData = currentHourlyData) {    
        // Clear previous charts
        d3.select("#activityChart").html("");
        d3.select("#temperatureChart").html("");
        
        // Create Activity Chart
        createSingleChart({
            data: hourlyData,
            containerId: 'activityChart',
            title: '24-Hour Activity Pattern',
            yAxisLabel: 'Activity Level',
            dataKey: 'avgActivity',
            color: activityColor,
            height: 350
        });
        
        // Create Temperature Chart
        createSingleChart({
            data: hourlyData,
            containerId: 'temperatureChart',
            title: '24-Hour Body Temperature Pattern',
            yAxisLabel: 'Body Temperature (°C)',
            dataKey: 'avgTemp',
            color: tempColor,
            height: 350,
            yAxisConfig: {
                min: 35.0,
                max: 39.0,
                padding: 0.1
            }
        });
    }

    // Generic function to create a single chart
    function createSingleChart(config) {
        const {
            data,
            containerId,
            title,
            yAxisLabel,
            dataKey,
            color,
            height = 350,
            yAxisConfig = null
        } = config;
        
        const margin = {top: 50, right: 40, bottom: 60, left: 60};
        const width = document.getElementById(containerId).clientWidth - margin.left - margin.right;
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
            yRange = calculateYAxisRange(
                data, 
                d => d[dataKey], 
                dataKey === 'avgActivity' ? 0 : 35.0,  // Different min based on data type
                dataKey === 'avgActivity' ? 60 : 39.0,  // Different max based on data type
                dataKey === 'avgActivity' ? 0.15 : 0.1  // Different padding based on data type
            );
        }
        
        const y = d3.scaleLinear()
            .domain(yRange)
            .range([chartHeight, 0]);
        
        // Add backgrounds to indicate light/dark periods
        data.forEach((d, i) => {
            if (i < data.length - 1) {
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
            .attr("y", -margin.left)
            .attr("x", -chartHeight/2)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text(yAxisLabel);
        
        // Add line with smoother curve and animation
        const linePath = svg.append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 3.5)
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("d", d3.line()
                .curve(d3.curveMonotoneX)
                .x(d => x(d.hour))
                .y(d => y(d[dataKey]))
            )
            .attr("stroke-dasharray", function() {
                return this.getTotalLength();
            })
            .attr("stroke-dashoffset", function() {
                return this.getTotalLength();
            });
            
        // Animate the line drawing
        linePath.transition()
            .duration(1500)
            .ease(d3.easeLinear)
            .attr("stroke-dashoffset", 0);
        
        // Add data points
        svg.selectAll(".data-point")
            .data(data)
            .enter()
            .append("circle")
            .attr("class", "data-point")
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
                            <strong>${dataKey === 'avgTemp' ? 'Temperature' : 'Activity'}:</strong> ${valueDisplay}<br>
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
        
        // Add legend
        createLegend(svg, [
            { label: dataKey === 'avgTemp' ? "Temperature" : "Activity", color: color, type: "line" },
            { label: "Light On", color: lightOnColor, type: "rect" },
            { label: "Light Off", color: lightOffColor, type: "rect" }
        ], { x: width - 130, y: 10 });
    }
    
    // Helper function to create legend
    function createLegend(svg, legendData, position) {
        const legend = svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${position.x}, ${position.y})`);
        
        // Background for legend
        legend.append("rect")
            .attr("width", 120)
            .attr("height", legendData.length * 20 + 20)
            .attr("fill", "white")
            .attr("opacity", 0.8)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("stroke", "#ddd")
            .attr("stroke-width", 1);
        
        // Add legend items
        const legendItems = legend.selectAll(".legend-item")
            .data(legendData)
            .enter()
            .append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(10, ${20 + i * 20})`);
        
        // Add appropriate symbols based on type
        legendItems.each(function(d, i) {
            const item = d3.select(this);
            if (d.type === "line") {
                // Line symbol
                item.append("line")
                    .attr("x1", 0)
                    .attr("y1", 0)
                    .attr("x2", 20)
                    .attr("y2", 0)
                    .attr("stroke", d.color)
                    .attr("stroke-width", 3);
                    
                item.append("circle")
                    .attr("cx", 10)
                    .attr("cy", 0)
                    .attr("r", 4)
                    .attr("fill", d.color);
            } else {
                // Rectangle symbol for light on/off
                item.append("rect")
                    .attr("width", 20)
                    .attr("height", 10)
                    .attr("y", -5)
                    .attr("fill", d.color)
                    .attr("stroke", "#ddd")
                    .attr("stroke-width", 0.5);
            }
            
            // Add label
            item.append("text")
                .attr("x", 30)
                .attr("y", 4)
                .text(d.label)
                .style("font-size", "12px");
        });
    }
    
    // Function to create bar charts for light vs dark comparison
    function createLightDarkCharts() {
        const data = window.dataModule.getLightDarkData();
        
        // Activity chart
        const activityMargin = {top: 40, right: 30, bottom: 70, left: 60};
        const activityWidth = document.getElementById('lightDarkActivityChart').clientWidth - activityMargin.left - activityMargin.right;
        const activityHeight = 300 - activityMargin.top - activityMargin.bottom;
        
        d3.select("#lightDarkActivityChart").html("");
        
        const activitySvg = d3.select("#lightDarkActivityChart")
            .append("svg")
            .attr("width", activityWidth + activityMargin.left + activityMargin.right)
            .attr("height", activityHeight + activityMargin.top + activityMargin.bottom)
            .append("g")
            .attr("transform", `translate(${activityMargin.left},${activityMargin.top})`);
        
        // Add title
        activitySvg.append("text")
            .attr("x", activityWidth / 2)
            .attr("y", -activityMargin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Activity Comparison: Light vs Dark");
        
        // X scale for activity
        const activityX = d3.scaleBand()
            .domain(data.map(d => d.condition))
            .range([0, activityWidth])
            .padding(0.4);
        
        // Y scale for activity
        const activityY = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.avgActivity) * 1.2])
            .range([activityHeight, 0]);
        
        // Add gridlines
        activitySvg.append("g")
            .attr("class", "grid")
            .style("stroke-dasharray", "3 3")
            .style("opacity", 0.3)
            .call(d3.axisLeft(activityY)
                .tickSize(-activityWidth)
                .tickFormat("")
            );
        
        // Add X axis for activity
        activitySvg.append("g")
            .attr("transform", `translate(0,${activityHeight})`)
            .call(d3.axisBottom(activityX))
            .selectAll("text")
            .style("text-anchor", "middle")
            .style("font-size", "12px");
        
        // Add Y axis for activity
        activitySvg.append("g")
            .call(d3.axisLeft(activityY))
            .selectAll("text")
            .style("font-size", "11px");
        
        // Add Y axis label for activity
        activitySvg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -activityMargin.left + 15)
            .attr("x", -activityHeight/2)
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Average Activity Level");
        
        // Create gradient for bars
        const activityGradient = activitySvg.append("defs")
            .append("linearGradient")
            .attr("id", "activity-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");
            
        activityGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#3498db")
            .attr("stop-opacity", 1);
            
        activityGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#2980b9")
            .attr("stop-opacity", 0.8);
        
        // Add bars for activity with animation
        activitySvg.selectAll(".activity-bar")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "activity-bar")
            .attr("x", d => activityX(d.condition))
            .attr("width", activityX.bandwidth())
            .attr("y", activityHeight)
            .attr("height", 0)
            .attr("fill", (d, i) => i === 0 ? "#34495e" : "url(#activity-gradient)")
            .attr("rx", 5)
            .attr("ry", 5)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("opacity", 0.8);
                    
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 1);
                    
                tooltip.html(`<strong>${d.condition}</strong><br>Average Activity: ${d.avgActivity.toFixed(1)}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(500)
                    .attr("opacity", 1);
                    
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .transition()
            .duration(800)
            .attr("y", d => activityY(d.avgActivity))
            .attr("height", d => activityHeight - activityY(d.avgActivity));
        
        // Add labels for activity bars
        activitySvg.selectAll(".activity-label")
            .data(data)
            .enter()
            .append("text")
            .attr("class", "activity-label")
            .attr("x", d => activityX(d.condition) + activityX.bandwidth()/2)
            .attr("y", d => activityY(d.avgActivity) - 10)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold")
            .style("font-size", "14px")
            .style("opacity", 0)
            .text(d => d.avgActivity.toFixed(1))
            .transition()
            .delay(800)
            .duration(500)
            .style("opacity", 1)
            .duration(500)
            .style("opacity", 1);
        
        // Temperature chart
        const tempMargin = {top: 40, right: 30, bottom: 70, left: 60};
        const tempWidth = document.getElementById('lightDarkTempChart').clientWidth - tempMargin.left - tempMargin.right;
        const tempHeight = 300 - tempMargin.top - tempMargin.bottom;
        
        d3.select("#lightDarkTempChart").html("");
        
        const tempSvg = d3.select("#lightDarkTempChart")
            .append("svg")
            .attr("width", tempWidth + tempMargin.left + tempMargin.right)
            .attr("height", tempHeight + tempMargin.top + tempMargin.bottom)
            .append("g")
            .attr("transform", `translate(${tempMargin.left},${tempMargin.top})`);
        
        // Add title
        tempSvg.append("text")
            .attr("x", tempWidth / 2)
            .attr("y", -tempMargin.top / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Temperature Comparison: Light vs Dark");
        
        // X scale for temperature
        const tempX = d3.scaleBand()
            .domain(data.map(d => d.condition))
            .range([0, tempWidth])
            .padding(0.4);
        
        // Y scale for temperature
        const tempY = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.avgTemp) * 1.05])
            .range([tempHeight, 0]);
        
        // Add gridlines
        tempSvg.append("g")
            .attr("class", "grid")
            .style("stroke-dasharray", "3 3")
            .style("opacity", 0.3)
            .call(d3.axisLeft(tempY)
                .tickSize(-tempWidth)
                .tickFormat("")
            );
        
        // Add X axis for temperature
        tempSvg.append("g")
            .attr("transform", `translate(0,${tempHeight})`)
            .call(d3.axisBottom(tempX))
            .selectAll("text")
            .style("text-anchor", "middle")
            .style("font-size", "12px");
        
        // Add Y axis for temperature
        tempSvg.append("g")
            .call(d3.axisLeft(tempY))
            .selectAll("text")
            .style("font-size", "11px");
        
        // Add Y axis label for temperature
        tempSvg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", -tempMargin.left + 5)
            .attr("x", -tempHeight / 2 )
            .attr("dy", "1em") 
            .style("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Average Body Temperature (°C)");
        
        // Create gradient for bars
        const tempGradient = tempSvg.append("defs")
            .append("linearGradient")
            .attr("id", "temp-gradient")
            .attr("x1", "0%")
            .attr("y1", "0%")
            .attr("x2", "0%")
            .attr("y2", "100%");
            
        tempGradient.append("stop")
            .attr("offset", "0%")
            .attr("stop-color", "#e74c3c")
            .attr("stop-opacity", 1);
            
        tempGradient.append("stop")
            .attr("offset", "100%")
            .attr("stop-color", "#c0392b")
            .attr("stop-opacity", 0.8);
        
        // Add bars for temperature with animation
        tempSvg.selectAll(".temp-bar")
            .data(data)
            .enter()
            .append("rect")
            .attr("class", "temp-bar")
            .attr("x", d => tempX(d.condition))
            .attr("width", tempX.bandwidth())
            .attr("y", tempHeight)
            .attr("height", 0)
            .attr("fill", (d, i) => i === 0 ? "#34495e" : "url(#temp-gradient)")
            .attr("rx", 5)
            .attr("ry", 5)
            .on("mouseover", function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("opacity", 0.8);
                    
                tooltip.transition()
                    .duration(200)
                    .style("opacity", 1);
                    
                tooltip.html(`<strong>${d.condition}</strong><br>Average Temperature: ${d.avgTemp.toFixed(2)}°C`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function() {
                d3.select(this)
                    .transition()
                    .duration(500)
                    .attr("opacity", 1);
                    
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            })
            .transition()
            .duration(800)
            .attr("y", d => tempY(d.avgTemp))
            .attr("height", d => tempHeight - tempY(d.avgTemp));
        
        // Add labels for temperature bars
        tempSvg.selectAll(".temp-label")
            .data(data)
            .enter()
            .append("text")
            .attr("class", "temp-label")
            .attr("x", d => tempX(d.condition) + tempX.bandwidth()/2)
            .attr("y", d => tempY(d.avgTemp) - 10)
            .attr("text-anchor", "middle")
            .style("font-weight", "bold")
            .style("font-size", "14px")
            .style("opacity", 0) // Start invisible for animation
            .text(d => d.avgTemp.toFixed(2) + "°C")
            .transition() // Add animation
            .delay(800)
            .duration(500)
            .style("opacity", 1);
    }
    
    // Helper function for flexible y-axis range
    function calculateYAxisRange(data, valueFn, defaultMin, defaultMax, paddingFactor = 0.1) {
        // Get actual min and max from data
        const values = data.map(valueFn);
        const dataMin = d3.min(values);
        const dataMax = d3.max(values);
    
        // Calculate the range with padding
        const range = dataMax - dataMin;
        const padding = range * paddingFactor;
    
        const min = Math.min(defaultMin, dataMin - padding);
        const max = Math.max(defaultMax, dataMax + padding);
        return [min, max];
    }

    // Function to update charts based on selected mouse and day
    async function updateCharts(mouseId, day) {
        try {
            // Get data for the selected mouse and day
            const mouseData = await window.dataModule.getMouseDayData(mouseId, day);
            
            // Process data into hourly averages
            const hourlyAverages = window.dataModule.calculateHourlyAverages(mouseData);
            
            // Store current data
            currentHourlyData = hourlyAverages;
            
            // Update charts with new data
            createSeparateCharts(hourlyAverages);
            
            return hourlyAverages;
        } catch (error) {
            console.error("Error updating charts:", error);
            return [];
        }
    }
    
    // Update gender statistic cards
    async function updateGenderCards() {
        try {
            const stats = await window.dataModule.getGenderStats();
            
            // Update male stats
            document.querySelector('.male-card .stat-value:nth-of-type(1)').textContent = stats.male.avgActivity.toFixed(1);
            document.querySelector('.male-card .stat-value:nth-of-type(2)').textContent = stats.male.avgTemp.toFixed(1) + '°C';
            
            // Update female stats
            document.querySelector('.female-card .stat-value:nth-of-type(1)').textContent = stats.female.avgActivity.toFixed(1);
            document.querySelector('.female-card .stat-value:nth-of-type(2)').textContent = stats.female.avgTemp.toFixed(1) + '°C';
        } catch (error) {
            console.error("Error updating gender cards:", error);
        }
    }
    
    return {
        createSeparateCharts,
        createLightDarkCharts,
        updateCharts,
        updateGenderCards,
        getCurrentData: () => currentHourlyData
    };
})();

window.chartsModule = chartsModule;