document.getElementById('handleForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const handlesInput = document.getElementById('handles').value.trim();
    const handles = handlesInput.split(',').map(h => h.trim()).filter(h => h);
    const resultsDiv = document.getElementById('results');
    const comparisonDiv = document.getElementById('comparison');
    
    if (handles.length === 0) {
        alert('Please enter at least one Codeforces handle');
        return;
    }

    try {
        resultsDiv.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>';
        comparisonDiv.innerHTML = '';
        
        if (handles.length === 1) {
            // Single user view
            const [userResponse, submissionsResponse, allTimeResponse] = await Promise.all([
                fetch(`/api/user/${handles[0]}`),
                fetch(`/api/submissions/${handles[0]}`),
                fetch(`/api/all-time/${handles[0]}`)
            ]);
            
            const userData = await userResponse.json();
            const submissionsData = await submissionsResponse.json();
            const allTimeData = await allTimeResponse.json();
            
            if (userResponse.ok && submissionsResponse.ok && allTimeResponse.ok) {
                // Create today's rating distribution chart data
                const todayRatingLabels = Object.keys(submissionsData.problem_ratings).sort((a, b) => a - b);
                const todayRatingData = todayRatingLabels.map(rating => submissionsData.problem_ratings[rating]);
                
                // Create all-time rating distribution chart data
                const allTimeRatingLabels = Object.keys(allTimeData.problem_ratings).sort((a, b) => a - b);
                const allTimeRatingData = allTimeRatingLabels.map(rating => allTimeData.problem_ratings[rating]);
                
                // Create verdict distribution chart data
                const verdictLabels = Object.keys(allTimeData.verdicts);
                const verdictData = verdictLabels.map(verdict => allTimeData.verdicts[verdict]);
                
                // Create tags chart data
                const tagLabels = Object.keys(allTimeData.tags);
                const tagData = tagLabels.map(tag => allTimeData.tags[tag]);
                
                resultsDiv.innerHTML = `
                    <div class="row mb-4">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h3 class="mb-0"><a href="https://codeforces.com/profile/${userData.handle}" target="_blank" class="text-decoration-none">${userData.handle}</a></h3>
                                            <p class="text-muted mb-0">${userData.rank || 'Unrated'} - ${userData.rating || 'Unrated'}</p>
                                        </div>
                                        <div class="text-end">
                                            <p class="mb-0"><strong>Max Rating:</strong> ${userData.maxRating || 'Unrated'}</p>
                                            <p class="mb-0"><strong>Max Rank:</strong> ${userData.maxRank || 'Unrated'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h4 class="section-title">Today's Progress</h4>
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card stats-card">
                                <div class="card-body text-center">
                                    <div class="stats-value">${submissionsData.total_submissions}</div>
                                    <div class="stats-label">Total Submissions</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stats-card">
                                <div class="card-body text-center">
                                    <div class="stats-value">${submissionsData.accepted}</div>
                                    <div class="stats-label">Accepted Solutions</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stats-card">
                                <div class="card-body text-center">
                                    <div class="stats-value">${submissionsData.wrong_answer}</div>
                                    <div class="stats-label">Wrong Answers</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stats-card">
                                <div class="card-body text-center">
                                    <div class="stats-value">${submissionsData.unique_solved}</div>
                                    <div class="stats-label">Unique Problems Solved</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row mb-4">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Today's Problem Rating Distribution</h5>
                                    <div class="chart-container">
                                        <canvas id="todayRatingChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <h4 class="section-title">All-Time Statistics</h4>
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card stats-card">
                                <div class="card-body text-center">
                                    <div class="stats-value">${allTimeData.total_submissions}</div>
                                    <div class="stats-label">Total Submissions</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stats-card">
                                <div class="card-body text-center">
                                    <div class="stats-value">${allTimeData.solved_problems.length}</div>
                                    <div class="stats-label">Total Solved</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stats-card">
                                <div class="card-body text-center">
                                    <div class="stats-value">${allTimeData.streak}</div>
                                    <div class="stats-label">Current Streak (days)</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stats-card">
                                <div class="card-body text-center">
                                    <div class="stats-value">${allTimeData.avg_attempts_per_ac}</div>
                                    <div class="stats-label">Avg. Attempts per AC</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12 mb-4">
                            <div class="card">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h5 class="card-title mb-0">Problem Solving Progress</h5>
                                        <div class="btn-group" role="group">
                                            <button type="button" class="btn btn-outline-primary active" data-range="30days">30 Days</button>
                                            <button type="button" class="btn btn-outline-primary" data-range="6months">6 Months</button>
                                            <button type="button" class="btn btn-outline-primary" data-range="alltime">All Time</button>
                                        </div>
                                    </div>
                                    <div class="chart-container">
                                        <canvas id="progressChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12 mb-4">
                            <div class="card">
                                <div class="card-body">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h5 class="card-title mb-0">Contest Rating Graph</h5>
                                        <div class="btn-group" role="group">
                                            <button type="button" class="btn btn-outline-primary active" data-metric="rating">Rating</button>
                                            <button type="button" class="btn btn-outline-primary" data-metric="rank">Rank</button>
                                            <button type="button" class="btn btn-outline-primary" data-metric="change">Rating Change</button>
                                        </div>
                                    </div>
                                    <div class="chart-container">
                                        <canvas id="ratingChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-12 mb-4">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title mb-3">Submission Activity Heatmap</h5>
                                    <div class="heatmap-container">
                                        <div class="heatmap-legend mb-3">
                                            <div class="d-flex justify-content-between align-items-center">
                                                <div class="legend-item">
                                                    <span class="legend-color" style="background-color: rgba(13, 110, 253, 0.1)"></span>
                                                    <span>Less Activity</span>
                                                </div>
                                                <div class="legend-item">
                                                    <span class="legend-color" style="background-color: rgba(13, 110, 253, 0.5)"></span>
                                                    <span>Medium Activity</span>
                                                </div>
                                                <div class="legend-item">
                                                    <span class="legend-color" style="background-color: rgba(13, 110, 253, 0.9)"></span>
                                                    <span>High Activity</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="heatmap-grid" id="submissionHeatmap"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="row mb-4">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">All-Time Problem Rating Distribution</h5>
                                    <div class="chart-container">
                                        <canvas id="allTimeRatingChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Verdict Distribution</h5>
                                    <div class="chart-container">
                                        <canvas id="verdictChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    <div class="row">
                        <div class="col-12 mb-4">
                            <div class="card">
                                <div class="card-body">
                                    <h5 class="card-title">Top Problem Tags</h5>
                                    <div class="chart-container">
                                        <canvas id="tagsChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // Create today's rating distribution chart
                new Chart(document.getElementById('todayRatingChart').getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: todayRatingLabels,
                        datasets: [{
                            label: 'Problems Solved Today by Rating',
                            data: todayRatingData,
                            backgroundColor: 'rgba(13, 110, 253, 0.5)',
                            borderColor: 'rgba(13, 110, 253, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Number of Problems'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Problem Rating'
                                }
                            }
                        }
                    }
                });

                // Create all-time rating distribution chart
                new Chart(document.getElementById('allTimeRatingChart').getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: allTimeRatingLabels,
                        datasets: [{
                            label: 'All-Time Problems Solved by Rating',
                            data: allTimeRatingData,
                            backgroundColor: 'rgba(40, 167, 69, 0.5)',
                            borderColor: 'rgba(40, 167, 69, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Number of Problems'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Problem Rating'
                                }
                            }
                        }
                    }
                });

                // Create the verdict distribution chart
                new Chart(document.getElementById('verdictChart').getContext('2d'), {
                    type: 'pie',
                    data: {
                        labels: verdictLabels,
                        datasets: [{
                            data: verdictData,
                            backgroundColor: [
                                'rgba(220, 53, 69, 0.5)',  
                                'rgba(220, 53, 69, 0.5)',  // WA
                                'rgba(40, 167, 69, 0.5)',  // OK
                                'rgba(23, 162, 184, 0.5)', // MLE
                                'rgba(108, 117, 125, 0.5)' // Others
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right'
                            }
                        }
                    }
                });

                // Create the progress chart
                let progressChart = null;
                function updateProgressChart(timeRange) {
                    const progressData = allTimeData.daily_solved[timeRange];
                    const ctx = document.getElementById('progressChart').getContext('2d');
                    
                    if (progressChart) {
                        progressChart.destroy();
                    }

                    // Format date labels based on time range
                    const formatDate = (dateStr) => {
                        const date = new Date(dateStr);
                        if (timeRange === '30days') {
                            return date.toLocaleDateString();
                        } else if (timeRange === '6months') {
                            const weekEnd = new Date(date);
                            weekEnd.setDate(date.getDate() + 6);
                            return `${date.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
                        } else {
                            // Format for fixed 4-month periods
                            const month = date.getMonth();
                            const year = date.getFullYear();
                            if (month === 0) { // January
                                return `Jan-Apr ${year}`;
                            } else if (month === 4) { // May
                                return `May-Aug ${year}`;
                            } else { // September
                                return `Sep-Dec ${year}`;
                            }
                        }
                    };
                    
                    progressChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: progressData.map(item => formatDate(item.date)),
                            datasets: [{
                                label: timeRange === '30days' ? 'Problems Solved per Day' :
                                       timeRange === '6months' ? 'Problems Solved per Week' :
                                       'Problems Solved per 4 Months',
                                data: progressData.map(item => item.solved),
                                borderColor: 'rgba(13, 110, 253, 1)',
                                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointHoverRadius: 6
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    title: {
                                        display: true,
                                        text: 'Problems Solved'
                                    },
                                    ticks: {
                                        stepSize: 1
                                    }
                                },
                                x: {
                                    title: {
                                        display: true,
                                        text: timeRange === '30days' ? 'Date' :
                                              timeRange === '6months' ? 'Week' :
                                              '4-Month Period'
                                    },
                                    ticks: {
                                        maxRotation: 45,
                                        minRotation: 45
                                    }
                                }
                            },
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const label = timeRange === '30days' ? 'problems today' :
                                                         timeRange === '6months' ? 'problems this week' :
                                                         'problems in this 4-month period';
                                            return `Solved: ${context.raw} ${label}`;
                                        }
                                    }
                                },
                                title: {
                                    display: true,
                                    text: timeRange === '30days' ? 'Daily Problem Solving Activity' :
                                          timeRange === '6months' ? 'Weekly Problem Solving Activity' :
                                          'Quarterly Problem Solving Activity'
                                }
                            }
                        }
                    });
                }

                // Create the rating chart
                let ratingChart = null;
                function updateRatingChart(metric) {
                    const ratingData = allTimeData.rating_history;
                    const ctx = document.getElementById('ratingChart').getContext('2d');
                    
                    if (ratingChart) {
                        ratingChart.destroy();
                    }

                    // Sort data by timestamp
                    ratingData.sort((a, b) => a.timestamp - b.timestamp);

                    // Prepare data based on selected metric
                    let labels, data, yAxisLabel, tooltipLabel;
                    if (metric === 'rating') {
                        labels = ratingData.map(item => new Date(item.timestamp * 1000).toLocaleDateString());
                        data = ratingData.map(item => item.newRating);
                        yAxisLabel = 'Rating';
                        tooltipLabel = 'Rating';
                    } else if (metric === 'rank') {
                        labels = ratingData.map(item => new Date(item.timestamp * 1000).toLocaleDateString());
                        data = ratingData.map(item => item.rank);
                        yAxisLabel = 'Rank';
                        tooltipLabel = 'Rank';
                    } else { // change
                        labels = ratingData.map(item => new Date(item.timestamp * 1000).toLocaleDateString());
                        data = ratingData.map(item => item.ratingChange);
                        yAxisLabel = 'Rating Change';
                        tooltipLabel = 'Rating Change';
                    }
                    
                    ratingChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: tooltipLabel,
                                data: data,
                                borderColor: metric === 'change' ? 
                                    (data.map(val => val >= 0 ? 'rgba(40, 167, 69, 1)' : 'rgba(220, 53, 69, 1)')) :
                                    'rgba(13, 110, 253, 1)',
                                backgroundColor: metric === 'change' ?
                                    (data.map(val => val >= 0 ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)')) :
                                    'rgba(13, 110, 253, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointHoverRadius: 6
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: metric === 'rank',
                                    title: {
                                        display: true,
                                        text: yAxisLabel
                                    }
                                },
                                x: {
                                    title: {
                                        display: true,
                                        text: 'Contest Date'
                                    },
                                    ticks: {
                                        maxRotation: 45,
                                        minRotation: 45
                                    }
                                }
                            },
                            plugins: {
                                tooltip: {
                                    callbacks: {
                                        label: function(context) {
                                            const contest = ratingData[context.dataIndex];
                                            let label = `${tooltipLabel}: ${context.raw}`;
                                            if (metric === 'rating') {
                                                label += ` (${contest.ratingChange >= 0 ? '+' : ''}${contest.ratingChange})`;
                                            }
                                            label += `\nContest: ${contest.contestName}`;
                                            if (metric !== 'rank') {
                                                label += `\nRank: ${contest.rank}`;
                                            }
                                            return label;
                                        }
                                    }
                                },
                                title: {
                                    display: true,
                                    text: 'Contest Performance History'
                                },
                                datalabels: {
                                    align: 'top',
                                    anchor: 'end',
                                    formatter: function(value, context) {
                                        const contest = ratingData[context.dataIndex];
                                        if (metric === 'rating') {
                                            return `${value}\n${contest.ratingChange >= 0 ? '+' : ''}${contest.ratingChange}`;
                                        }
                                        return value;
                                    },
                                    color: function(context) {
                                        if (metric === 'change') {
                                            return context.raw >= 0 ? 'rgba(40, 167, 69, 1)' : 'rgba(220, 53, 69, 1)';
                                        }
                                        return 'rgba(0, 0, 0, 0.8)';
                                    },
                                    font: {
                                        weight: 'bold',
                                        size: 11
                                    },
                                    padding: {
                                        top: 4
                                    }
                                }
                            }
                        },
                        plugins: [ChartDataLabels]
                    });
                }

                // Create the heatmap
                function createHeatmap(heatmapData) {
                    const heatmapContainer = document.getElementById('submissionHeatmap');
                    heatmapContainer.innerHTML = '';

                    // Year selector (default: current year)
                    const currentYear = new Date().getFullYear();
                    const yearSelector = document.createElement('select');
                    yearSelector.className = 'form-select mb-3';
                    yearSelector.style.width = '200px';
                    
                    // Add "Last 365 Days" option
                    const lastYearOption = document.createElement('option');
                    lastYearOption.value = 'last365';
                    lastYearOption.textContent = 'Last 365 Days';
                    lastYearOption.selected = true;
                    yearSelector.appendChild(lastYearOption);
                    
                    // Add year options
                    for (let year = currentYear; year >= 2010; year--) {
                        const option = document.createElement('option');
                        option.value = year;
                        option.textContent = year;
                        yearSelector.appendChild(option);
                    }
                    
                    yearSelector.addEventListener('change', async function() {
                        const selectedValue = this.value;
                        const handle = document.getElementById('handles').value.trim();
                        try {
                            let response;
                            if (selectedValue === 'last365') {
                                response = await fetch(`/api/heatmap/${handle}`);
                            } else {
                                response = await fetch(`/api/heatmap/${handle}/${selectedValue}`);
                            }
                            const data = await response.json();
                            if (response.ok) createHeatmapGrid(data, selectedValue === 'last365' ? null : parseInt(selectedValue), true);
                        } catch (error) { console.error('Error fetching heatmap data:', error); }
                    });
                    heatmapContainer.appendChild(yearSelector);
                    createHeatmapGrid(heatmapData, null, false);
                }

                function createHeatmapGrid(heatmapData, year, showFullYear = false) {
                    const heatmapContainer = document.getElementById('submissionHeatmap');
                    // Remove existing grid if any
                    const existingGrid = heatmapContainer.querySelector('.heatmap-github-grid');
                    if (existingGrid) existingGrid.remove();
                    const existingLegend = heatmapContainer.querySelector('.heatmap-legend');
                    if (existingLegend) existingLegend.remove();
                    const existingScale = heatmapContainer.querySelector('.heatmap-scale-bar');
                    if (existingScale) existingScale.remove();
                    const existingTooltip = document.getElementById('heatmap-tooltip');
                    if (existingTooltip) existingTooltip.remove();

                    // Prepare a map of date string to data for fast lookup
                    const dataMap = {};
                    heatmapData.forEach(item => { dataMap[item.date] = item; });

                    // Find the first Sunday of the year or 365 days ago
                    const today = new Date();
                    const firstDay = year ? new Date(year, 0, 1) : new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
                    const firstSunday = new Date(firstDay);
                    while (firstSunday.getDay() !== 0) firstSunday.setDate(firstSunday.getDate() + 1);
                    
                    // Find the last day to display
                    let lastDay;
                    if (showFullYear && year) {
                        lastDay = new Date(year, 11, 31);
                    } else {
                        lastDay = today;
                    }

                    // Build a 2D array: weeks x days
                    const weeks = [];
                    let current = new Date(firstSunday);
                    while (current <= lastDay) {
                        const week = [];
                        for (let d = 0; d < 7; d++) {
                            const date = new Date(current);
                            week.push(date.getFullYear() === (year || today.getFullYear()) && date <= lastDay ? date.toISOString().slice(0, 10) : null);
                            current.setDate(current.getDate() + 1);
                        }
                        weeks.push(week);
                    }

                    // Color scale (custom thresholds)
                    const colorScale = [
                        '#ebedf0', // 0
                        '#c6e6ff', // 1-2 (less)
                        '#7fc7ff', // 3-5 (medium)
                        '#3182ce'  // 6+ (high)
                    ];
                    const futureColor = '#f5f5f5'; // For future days
                    function getColor(val) {
                        if (!val || val === 0) return colorScale[0]; // No activity
                        if (val >= 1 && val <= 2) return colorScale[1]; // Less
                        if (val >= 3 && val <= 5) return colorScale[2]; // Medium
                        if (val >= 6) return colorScale[3]; // High
                        return colorScale[0];
                    }

                    // Color scale bar (above grid)
                    const scaleBar = document.createElement('div');
                    scaleBar.className = 'heatmap-scale-bar';
                    scaleBar.style.display = 'flex';
                    scaleBar.style.alignItems = 'center';
                    scaleBar.style.gap = '2px';
                    scaleBar.style.marginBottom = '8px';
                    scaleBar.innerHTML = `<span style='font-size:12px;color:#666;'>0</span>`;
                    colorScale.forEach((color, i) => {
                        const swatch = document.createElement('span');
                        swatch.style.display = 'inline-block';
                        swatch.style.width = '28px';
                        swatch.style.height = '14px';
                        swatch.style.background = color;
                        swatch.style.borderRadius = '3px';
                        swatch.style.border = '1px solid #e0e0e0';
                        scaleBar.appendChild(swatch);
                    });
                    scaleBar.innerHTML += `<span style='font-size:12px;color:#666;'>6+</span>`;
                    heatmapContainer.appendChild(scaleBar);

                    // Main grid container
                    const gridWrapper = document.createElement('div');
                    gridWrapper.className = 'heatmap-github-grid';
                    gridWrapper.style.display = 'flex';
                    gridWrapper.style.flexDirection = 'row';
                    gridWrapper.style.alignItems = 'flex-start';
                    gridWrapper.style.position = 'relative';
                    gridWrapper.style.overflowX = 'auto';
                    gridWrapper.style.marginBottom = '10px';

                    // Year label (left)
                    const yearLabel = document.createElement('div');
                    yearLabel.className = 'heatmap-year-label';
                    yearLabel.textContent = year || 'Last 365 Days';
                    yearLabel.style.fontSize = '2rem';
                    yearLabel.style.color = '#b0b0b0';
                    yearLabel.style.fontWeight = 'bold';
                    yearLabel.style.marginRight = '12px';
                    yearLabel.style.marginTop = '30px';
                    yearLabel.style.writingMode = 'vertical-rl';
                    yearLabel.style.textAlign = 'center';
                    yearLabel.style.letterSpacing = '2px';
                    gridWrapper.appendChild(yearLabel);

                    // Table for grid (month labels in first row)
                    const table = document.createElement('table');
                    table.className = 'heatmap-table';
                    table.style.borderCollapse = 'collapse';
                    table.style.background = 'none';

                    // --- Month label row ---
                    const monthRow = document.createElement('tr');
                    monthRow.className = 'heatmap-month-row';
                    // First cell is empty (for day labels)
                    const emptyCell = document.createElement('th');
                    emptyCell.style.width = '28px';
                    emptyCell.style.background = 'none';
                    emptyCell.style.border = 'none';
                    monthRow.appendChild(emptyCell);
                    // Calculate month label spans
                    let weekIdx = 0;
                    let lastMonth = null;
                    let colSpan = 0;
                    for (let w = 0; w < weeks.length; w++) {
                        const week = weeks[w];
                        const firstDate = week.find(Boolean);
                        if (firstDate) {
                            const month = new Date(firstDate).getMonth();
                            if (month !== lastMonth) {
                                // If not the first month, append the previous month label
                                if (lastMonth !== null) {
                                    const th = document.createElement('th');
                                    th.colSpan = colSpan;
                                    th.textContent = new Date(year || today.getFullYear(), lastMonth, 1).toLocaleString('en-US', { month: 'short' });
                                    th.style.fontSize = '12px';
                                    th.style.color = '#666';
                                    th.style.textAlign = 'center';
                                    th.style.background = 'none';
                                    th.style.border = 'none';
                                    monthRow.appendChild(th);
                                }
                                lastMonth = month;
                                colSpan = 1;
                            } else {
                                colSpan++;
                            }
                        } else {
                            colSpan++;
                        }
                    }
                    // Append the last month label
                    if (lastMonth !== null) {
                        const th = document.createElement('th');
                        th.colSpan = colSpan;
                        th.textContent = new Date(year || today.getFullYear(), lastMonth, 1).toLocaleString('en-US', { month: 'short' });
                        th.style.fontSize = '12px';
                        th.style.color = '#666';
                        th.style.textAlign = 'center';
                        th.style.background = 'none';
                        th.style.border = 'none';
                        monthRow.appendChild(th);
                    }
                    table.appendChild(monthRow);

                    // --- Day label + grid rows ---
                    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    for (let d = 0; d < 7; d++) {
                        const tr = document.createElement('tr');
                        // Day label
                        const dayCell = document.createElement('th');
                        dayCell.textContent = dayLabels[d][0];
                        dayCell.style.fontSize = '11px';
                        dayCell.style.color = '#b0b0b0';
                        dayCell.style.textAlign = 'center';
                        dayCell.style.background = 'none';
                        dayCell.style.border = 'none';
                        dayCell.style.width = '28px';
                        tr.appendChild(dayCell);
                        // Week columns
                        for (let w = 0; w < weeks.length; w++) {
                            const dateStr = weeks[w][d];
                            const td = document.createElement('td');
                            td.className = 'heatmap-cell';
                            td.style.width = '22px';
                            td.style.height = '22px';
                            td.style.borderRadius = '4px';
                            td.style.transition = 'transform 0.15s, box-shadow 0.15s, filter 0.15s;';
                            // Determine if this is a future day
                            let isFuture = false;
                            if (dateStr) {
                                const cellDate = new Date(dateStr);
                                const now = new Date();
                                isFuture = cellDate > now;
                            }
                            if (isFuture) {
                                td.style.background = futureColor;
                                td.style.opacity = 0.7;
                                td.style.cursor = 'not-allowed';
                            } else {
                                td.style.background = dateStr && dataMap[dateStr] ? getColor(dataMap[dateStr].total) : colorScale[0];
                                td.style.cursor = 'pointer';
                            }
                            td.style.border = '1px solid #e0e0e0';
                            td.style.margin = '0';
                            td.style.position = 'relative';
                            if (dateStr && dataMap[dateStr] && !isFuture) {
                                const dObj = dataMap[dateStr];
                                td.addEventListener('mouseenter', (e) => {
                                    td.style.transform = 'scale(1.5)';
                                    td.style.filter = 'drop-shadow(0 0 8px #3182ce)';
                                    td.style.zIndex = 10;
                                    // Custom tooltip
                                    let tooltip = document.getElementById('heatmap-tooltip');
                                    if (!tooltip) {
                                        tooltip = document.createElement('div');
                                        tooltip.id = 'heatmap-tooltip';
                                        tooltip.style.position = 'fixed';
                                        tooltip.style.background = 'rgba(30,30,50,0.97)';
                                        tooltip.style.color = '#fff';
                                        tooltip.style.padding = '12px 18px';
                                        tooltip.style.borderRadius = '8px';
                                        tooltip.style.fontSize = '15px';
                                        tooltip.style.fontWeight = '500';
                                        tooltip.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
                                        tooltip.style.pointerEvents = 'none';
                                        tooltip.style.zIndex = 9999;
                                        document.body.appendChild(tooltip);
                                    }
                                    tooltip.innerHTML = `
                                        <div style='font-size:16px;font-weight:bold;margin-bottom:4px;'>${new Date(dateStr).toLocaleDateString()}</div>
                                        <div style='margin-bottom:2px;'>Total Submissions: <b>${dObj.total}</b></div>
                                        <div style='margin-bottom:2px;'>Accepted Solutions: <b>${dObj.accepted}</b></div>
                                        <div>Unique Problems Solved: <b>${dObj.unique_solved}</b></div>
                                    `;
                                    const rect = td.getBoundingClientRect();
                                    tooltip.style.left = (rect.left + window.scrollX + rect.width + 10) + 'px';
                                    tooltip.style.top = (rect.top + window.scrollY - 10) + 'px';
                                    tooltip.style.display = 'block';
                                });
                                td.addEventListener('mouseleave', () => {
                                    td.style.transform = '';
                                    td.style.filter = '';
                                    td.style.zIndex = '';
                                    const tooltip = document.getElementById('heatmap-tooltip');
                                    if (tooltip) tooltip.style.display = 'none';
                                });
                            } else {
                                td.style.opacity = isFuture ? 0.7 : 0.3;
                            }
                            tr.appendChild(td);
                        }
                        table.appendChild(tr);
                    }
                    gridWrapper.appendChild(table);
                    heatmapContainer.appendChild(gridWrapper);

                    // Custom legend for activity levels
                    const legend = document.createElement('div');
                    legend.className = 'heatmap-legend';
                    legend.style.display = 'flex';
                    legend.style.alignItems = 'center';
                    legend.style.gap = '8px';
                    legend.style.marginTop = '8px';
                    legend.innerHTML = `
                        <span style="font-size:12px;color:#666;">No Activity</span>
                        <span style="display:inline-block;width:22px;height:16px;background:${colorScale[1]};border-radius:4px;border:1px solid #e0e0e0;"></span>
                        <span style="font-size:12px;color:#666;">1-2</span>
                        <span style="display:inline-block;width:22px;height:16px;background:${colorScale[2]};border-radius:4px;border:1px solid #e0e0e0;"></span>
                        <span style="font-size:12px;color:#666;">3-5</span>
                        <span style="display:inline-block;width:22px;height:16px;background:${colorScale[3]};border-radius:4px;border:1px solid #e0e0e0;"></span>
                        <span style="font-size:12px;color:#666;">6+</span>
                        <span style="display:inline-block;width:22px;height:16px;background:${futureColor};border-radius:4px;border:1px solid #e0e0e0;"></span>
                        <span style="font-size:12px;color:#666;">Future</span>
                    `;
                    heatmapContainer.appendChild(legend);
                }

                // Initialize with 30 days view for progress chart
                updateProgressChart('30days');

                // Initialize with rating view for rating chart
                updateRatingChart('rating');

                // Create the heatmap
                createHeatmap(allTimeData.heatmap_data);

                // Add click handlers for time range buttons
                document.querySelectorAll('[data-range]').forEach(button => {
                    button.addEventListener('click', function() {
                        // Update active state
                        document.querySelectorAll('[data-range]').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        this.classList.add('active');
                        
                        // Update chart
                        updateProgressChart(this.dataset.range);
                    });
                });

                // Add click handlers for rating metric buttons
                document.querySelectorAll('[data-metric]').forEach(button => {
                    button.addEventListener('click', function() {
                        // Update active state
                        document.querySelectorAll('[data-metric]').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        this.classList.add('active');
                        
                        // Update chart
                        updateRatingChart(this.dataset.metric);
                    });
                });

                // Create the tags chart
                new Chart(document.getElementById('tagsChart').getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: tagLabels,
                        datasets: [{
                            label: 'Problems by Tag',
                            data: tagData,
                            backgroundColor: 'rgba(13, 110, 253, 0.5)',
                            borderColor: 'rgba(13, 110, 253, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        scales: {
                            x: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Number of Problems'
                                }
                            }
                        }
                    }
                });
            } else {
                resultsDiv.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        ${userData.error || submissionsData.error || allTimeData.error || 'Failed to fetch data'}
                    </div>
                `;
            }
        } else {
            // Multiple users comparison
            const response = await fetch('/api/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ handles })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Sort by today's solved problems
                const todayLeaderboard = [...data].sort((a, b) => 
                    b.today_stats.solved_problems - a.today_stats.solved_problems
                );
                
                // Sort by all-time solved problems
                const allTimeLeaderboard = [...data].sort((a, b) => 
                    b.all_time_stats.total_solved - a.all_time_stats.total_solved
                );
                
                comparisonDiv.innerHTML = `
                    <h4 class="section-title">Today's Leaderboard</h4>
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Handle</th>
                                            <th>Solved Today</th>
                                            <th>Total Submissions</th>
                                            <th>Last Submission</th>
                                            <th>Rating</th>
                                            <th>Last Active</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${todayLeaderboard.map((user, index) => `
                                            <tr class="rank-${index + 1}">
                                                <td>${index + 1}</td>
                                                <td><a href="https://codeforces.com/profile/${user.handle}" target="_blank" class="text-decoration-none">${user.handle}</a></td>
                                                <td>${user.today_stats.solved_problems}</td>
                                                <td>${user.today_stats.total_submissions}</td>
                                                <td>
                                                    ${user.today_stats.last_submission ? `
                                                        <a href="https://codeforces.com/problemset/problem/${user.today_stats.last_submission.problem.contestId}/${user.today_stats.last_submission.problem.index}" target="_blank">
                                                            ${user.today_stats.last_submission.problem.name}
                                                        </a>
                                                        <br>
                                                        <small class="text-muted">
                                                            ${user.today_stats.last_submission.verdict} 
                                                            (${new Date(user.today_stats.last_submission.creationTimeSeconds * 1000).toLocaleTimeString()})
                                                        </small>
                                                    ` : 'No submissions today'}
                                                </td>
                                                <td>${user.user_info.rating || 'Unrated'}</td>
                                                <td>${getRelativeTimeString(user.last_active?.time * 1000)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <h4 class="section-title">All-Time Leaderboard</h4>
                    <div class="card mb-4">
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table">
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Handle</th>
                                            <th>Total Solved</th>
                                            <th>Total Submissions</th>
                                            <th>Current Streak</th>
                                            <th>Avg. Attempts/AC</th>
                                            <th>Rating</th>
                                            <th>Last Active</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${allTimeLeaderboard.map((user, index) => `
                                            <tr class="rank-${index + 1}">
                                                <td>${index + 1}</td>
                                                <td><a href="https://codeforces.com/profile/${user.handle}" target="_blank" class="text-decoration-none">${user.handle}</a></td>
                                                <td>${user.all_time_stats.total_solved}</td>
                                                <td>${user.all_time_stats.total_submissions}</td>
                                                <td>${user.all_time_stats.streak} days</td>
                                                <td>${user.all_time_stats.avg_attempts_per_ac.toFixed(2)}</td>
                                                <td>${user.user_info.rating || 'Unrated'}</td>
                                                <td>${getRelativeTimeString(user.last_active?.time * 1000)}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <h4 class="section-title">Problem Solving Distribution</h4>
                    <div class="row">
                        <div class="col-12">
                            <div class="card">
                                <div class="card-body">
                                    <div class="chart-container">
                                        <canvas id="comparisonRatingChart"></canvas>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                // Create comparison rating distribution chart
                const ratingLabels = Object.keys(allTimeLeaderboard[0].all_time_stats.problem_ratings).sort((a, b) => a - b);
                const datasets = allTimeLeaderboard.map((user, index) => ({
                    label: user.handle,
                    data: ratingLabels.map(rating => user.all_time_stats.problem_ratings[rating] || 0),
                    backgroundColor: `rgba(${index * 50}, ${255 - index * 30}, ${index * 40}, 0.5)`,
                    borderColor: `rgba(${index * 50}, ${255 - index * 30}, ${index * 40}, 1)`,
                    borderWidth: 1
                }));

                new Chart(document.getElementById('comparisonRatingChart').getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ratingLabels,
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                title: {
                                    display: true,
                                    text: 'Number of Problems'
                                }
                            },
                            x: {
                                title: {
                                    display: true,
                                    text: 'Problem Rating'
                                }
                            }
                        },
                        plugins: {
                            title: {
                                display: true,
                                text: 'Problem Rating Distribution Comparison'
                            }
                        }
                    }
                });
            } else {
                comparisonDiv.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        ${data.error || 'Failed to fetch comparison data'}
                    </div>
                `;
            }
        }
    } catch (error) {
        resultsDiv.innerHTML = `
            <div class="alert alert-danger" role="alert">
                An error occurred while fetching the data
            </div>
        `;
    }
});

function getRelativeTimeString(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const date = new Date(timestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
        return 'Unknown';
    }
    
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    // If less than 5 minutes ago, consider user as online
    if (diffInSeconds < 300) {
        return '<span class="text-success fw-bold">Active Now</span>';
    }
    
    if (diffInSeconds < 60) {
        return 'just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
        return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
        return `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
    }
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
} 