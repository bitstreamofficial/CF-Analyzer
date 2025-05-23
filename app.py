from flask import Flask, render_template, request, jsonify
import requests
from datetime import datetime, timedelta, timezone
from collections import defaultdict, Counter
import json

app = Flask(__name__)

# Codeforces API base URL
CODEFORCES_API_URL = "https://codeforces.com/api"

dhaka_tz = timezone(timedelta(hours=6))

def calculate_streak(submissions):
    if not submissions:
        return 0
    
    # Sort submissions by time
    sorted_submissions = sorted(submissions, key=lambda x: x['creationTimeSeconds'])
    
    # Convert timestamps to dates
    dates = set()
    for submission in sorted_submissions:
        date = datetime.fromtimestamp(submission['creationTimeSeconds'], dhaka_tz).date()
        dates.add(date)
    
    # Calculate streak
    dates = sorted(list(dates))
    if not dates:
        return 0
        
    current_streak = 1
    max_streak = 1
    
    for i in range(1, len(dates)):
        if (dates[i] - dates[i-1]).days == 1:
            current_streak += 1
            max_streak = max(max_streak, current_streak)
        else:
            current_streak = 1
            
    return max_streak

def get_all_time_stats(submissions):
    stats = {
        'total_submissions': len(submissions),
        'verdicts': defaultdict(int),
        'problem_ratings': defaultdict(int),
        'solved_problems': set(),
        'problem_attempts': defaultdict(int),
        'tags': Counter(),
        'streak': calculate_streak(submissions)
    }
    
    for submission in submissions:
        # Count verdicts
        stats['verdicts'][submission['verdict']] += 1
        
        # Track problem attempts
        problem_id = f"{submission['problem']['contestId']}{submission['problem']['index']}"
        stats['problem_attempts'][problem_id] += 1
        
        # If accepted, add to solved problems and collect tags
        if submission['verdict'] == 'OK':
            stats['solved_problems'].add(problem_id)
            if 'problem' in submission and 'rating' in submission['problem']:
                stats['problem_ratings'][submission['problem']['rating']] += 1
            if 'problem' in submission and 'tags' in submission['problem']:
                stats['tags'].update(submission['problem']['tags'])
    
    # Calculate average attempts per AC
    total_attempts = sum(stats['problem_attempts'].values())
    total_solved = len(stats['solved_problems'])
    stats['avg_attempts_per_ac'] = round(total_attempts / total_solved if total_solved > 0 else 0, 2)
    
    # Convert sets and counters to regular dicts
    stats['solved_problems'] = list(stats['solved_problems'])
    stats['verdicts'] = dict(stats['verdicts'])
    stats['problem_ratings'] = dict(stats['problem_ratings'])
    stats['tags'] = dict(stats['tags'].most_common(10))  # Top 10 tags
    
    return stats

def get_daily_solved_stats(submissions, time_range='30days'):
    # Sort submissions by time
    sorted_submissions = sorted(submissions, key=lambda x: x['creationTimeSeconds'])
    
    # Initialize daily solved problems tracking
    daily_solved = defaultdict(set)
    
    # Track solved problems by date
    for submission in sorted_submissions:
        if submission['verdict'] == 'OK':
            date = datetime.fromtimestamp(submission['creationTimeSeconds'], dhaka_tz).date()
            problem_id = f"{submission['problem']['contestId']}{submission['problem']['index']}"
            daily_solved[date].add(problem_id)
    
    # Get the date range based on the selected option
    end_date = datetime.now(dhaka_tz).date()
    if time_range == '30days':
        start_date = end_date - timedelta(days=29)  # 29 days ago to include today
        # Create a list of all dates in the range
        date_range = []
        current_date = start_date
        while current_date <= end_date:
            date_range.append(current_date)
            current_date += timedelta(days=1)
        
        # Create daily solved counts
        daily_stats = []
        for date in date_range:
            daily_stats.append({
                'date': date.isoformat(),
                'solved': len(daily_solved[date])
            })
        return daily_stats
        
    elif time_range == '6months':
        start_date = end_date - timedelta(days=180)  # 180 days ago
        # Group by weeks
        weekly_stats = defaultdict(set)
        current_date = start_date
        while current_date <= end_date:
            # Get the start of the week (Monday)
            week_start = current_date - timedelta(days=current_date.weekday())
            week_end = week_start + timedelta(days=6)
            if week_end > end_date:
                week_end = end_date
            
            # Add all problems solved in this week
            for date in daily_solved:
                if week_start <= date <= week_end:
                    weekly_stats[week_start].update(daily_solved[date])
            
            current_date += timedelta(days=7)
        
        # Convert to list format
        weekly_data = []
        for week_start in sorted(weekly_stats.keys()):
            weekly_data.append({
                'date': week_start.isoformat(),
                'solved': len(weekly_stats[week_start])
            })
        return weekly_data
        
    else:  # all time
        if not daily_solved:
            return []
        start_date = min(daily_solved.keys())
        
        # Group by 4-month periods (Jan-Apr, May-Aug, Sep-Dec)
        quarterly_stats = defaultdict(set)
        current_date = start_date
        
        while current_date <= end_date:
            # Calculate the start of the 4-month period
            if current_date.month <= 4:
                quarter_start = datetime(current_date.year, 1, 1, tzinfo=dhaka_tz).date()  # Jan
                quarter_end = datetime(current_date.year, 4, 30, tzinfo=dhaka_tz).date()   # Apr
            elif current_date.month <= 8:
                quarter_start = datetime(current_date.year, 5, 1, tzinfo=dhaka_tz).date()  # May
                quarter_end = datetime(current_date.year, 8, 31, tzinfo=dhaka_tz).date()   # Aug
            else:
                quarter_start = datetime(current_date.year, 9, 1, tzinfo=dhaka_tz).date()  # Sep
                quarter_end = datetime(current_date.year, 12, 31, tzinfo=dhaka_tz).date()  # Dec
            
            if quarter_end > end_date:
                quarter_end = end_date
            
            # Add all problems solved in this 4-month period
            for date in daily_solved:
                if quarter_start <= date <= quarter_end:
                    quarterly_stats[quarter_start].update(daily_solved[date])
            
            # Move to next 4-month period
            if current_date.month <= 4:
                current_date = datetime(current_date.year, 5, 1, tzinfo=dhaka_tz).date()
            elif current_date.month <= 8:
                current_date = datetime(current_date.year, 9, 1, tzinfo=dhaka_tz).date()
            else:
                current_date = datetime(current_date.year + 1, 1, 1, tzinfo=dhaka_tz).date()
        
        # Convert to list format
        quarterly_data = []
        for quarter_start in sorted(quarterly_stats.keys()):
            quarterly_data.append({
                'date': quarter_start.isoformat(),
                'solved': len(quarterly_stats[quarter_start])
            })
        return quarterly_data

def get_submission_heatmap(submissions, year=None):
    # Initialize a dictionary to store submissions by date
    heatmap_data = defaultdict(lambda: {
        'total': 0,
        'accepted': 0,
        'problems': set()
    })
    
    # Get current date for default year selection
    current_date = datetime.now(dhaka_tz)
    end_date = current_date.date()
    
    # If no year specified, get last 365 days
    if year is None:
        start_date = end_date - timedelta(days=364)  # 364 days ago to include today
    else:
        start_date = datetime(year, 1, 1, tzinfo=dhaka_tz).date()
        end_date = datetime(year, 12, 31, tzinfo=dhaka_tz).date()
    
    # Process submissions
    for submission in submissions:
        date = datetime.fromtimestamp(submission['creationTimeSeconds'], dhaka_tz).date()
        # Only include submissions within the date range
        if start_date <= date <= end_date:
            date_str = date.isoformat()
            heatmap_data[date_str]['total'] += 1
            if submission['verdict'] == 'OK':
                heatmap_data[date_str]['accepted'] += 1
                problem_id = f"{submission['problem']['contestId']}{submission['problem']['index']}"
                heatmap_data[date_str]['problems'].add(problem_id)
    
    # Convert to list format and include day of week
    heatmap_list = []
    for date_str, data in heatmap_data.items():
        date = datetime.fromisoformat(date_str).date()
        heatmap_list.append({
            'date': date_str,
            'day': date.weekday(),  # 0 = Monday, 6 = Sunday
            'total': data['total'],
            'accepted': data['accepted'],
            'unique_solved': len(data['problems'])
        })
    
    return heatmap_list

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/user/<handle>')
def get_user_data(handle):
    try:
        # Get user info
        response = requests.get(f"{CODEFORCES_API_URL}/user.info?handles={handle}")
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch user data"}), 400
        
        user_data = response.json()
        if user_data['status'] != 'OK':
            return jsonify({"error": "User not found"}), 404
            
        return jsonify(user_data['result'][0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/submissions/<handle>')
def get_submission_stats(handle):
    try:
        # Get user submissions
        response = requests.get(f"{CODEFORCES_API_URL}/user.status?handle={handle}")
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch submission data"}), 400
        
        submissions_data = response.json()
        if submissions_data['status'] != 'OK':
            return jsonify({"error": "Failed to fetch submissions"}), 404

        # Get today's date in seconds since epoch
        today = datetime.now(dhaka_tz).replace(hour=0, minute=0, second=0, microsecond=0)
        today_seconds = int(today.timestamp())

        # Initialize statistics
        daily_stats = {
            'total_submissions': 0,
            'accepted': 0,
            'wrong_answer': 0,
            'problem_ratings': defaultdict(int),
            'solved_problems': set()
        }

        # Process submissions
        for submission in submissions_data['result']:
            submission_time = submission['creationTimeSeconds']
            
            # Only process today's submissions
            if submission_time >= today_seconds:
                daily_stats['total_submissions'] += 1
                
                # Check verdict
                verdict = submission['verdict']
                if verdict == 'OK':
                    daily_stats['accepted'] += 1
                    # Add problem rating if available
                    if 'problem' in submission and 'rating' in submission['problem']:
                        daily_stats['problem_ratings'][submission['problem']['rating']] += 1
                    # Add to solved problems set
                    problem_id = f"{submission['problem']['contestId']}{submission['problem']['index']}"
                    daily_stats['solved_problems'].add(problem_id)
                elif verdict == 'WRONG_ANSWER':
                    daily_stats['wrong_answer'] += 1

        # Convert problem_ratings to regular dict and solved_problems to list
        daily_stats['problem_ratings'] = dict(daily_stats['problem_ratings'])
        daily_stats['solved_problems'] = list(daily_stats['solved_problems'])
        daily_stats['unique_solved'] = len(daily_stats['solved_problems'])

        return jsonify(daily_stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/rating-history/<handle>')
def get_rating_history(handle):
    try:
        # Get user rating history
        response = requests.get(f"{CODEFORCES_API_URL}/user.rating?handle={handle}")
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch rating history"}), 400
        
        rating_data = response.json()
        if rating_data['status'] != 'OK':
            return jsonify({"error": "Failed to fetch rating history"}), 404
            
        # Process rating history
        rating_history = []
        for contest in rating_data['result']:
            rating_history.append({
                'contestId': contest['contestId'],
                'contestName': contest['contestName'],
                'rank': contest['rank'],
                'oldRating': contest['oldRating'],
                'newRating': contest['newRating'],
                'ratingChange': contest['newRating'] - contest['oldRating'],
                'timestamp': contest['ratingUpdateTimeSeconds']
            })
            
        return jsonify(rating_history)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/all-time/<handle>')
def get_all_time_stats_route(handle):
    try:
        # Get user submissions
        response = requests.get(f"{CODEFORCES_API_URL}/user.status?handle={handle}")
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch submission data"}), 400
        
        submissions_data = response.json()
        if submissions_data['status'] != 'OK':
            return jsonify({"error": "Failed to fetch submissions"}), 404

        # Get rating history
        rating_response = requests.get(f"{CODEFORCES_API_URL}/user.rating?handle={handle}")
        rating_history = []
        if rating_response.status_code == 200:
            rating_data = rating_response.json()
            if rating_data['status'] == 'OK':
                for contest in rating_data['result']:
                    rating_history.append({
                        'contestId': contest['contestId'],
                        'contestName': contest['contestName'],
                        'rank': contest['rank'],
                        'oldRating': contest['oldRating'],
                        'newRating': contest['newRating'],
                        'ratingChange': contest['newRating'] - contest['oldRating'],
                        'timestamp': contest['ratingUpdateTimeSeconds']
                    })

        stats = get_all_time_stats(submissions_data['result'])
        stats['daily_solved'] = {
            '30days': get_daily_solved_stats(submissions_data['result'], '30days'),
            '6months': get_daily_solved_stats(submissions_data['result'], '6months'),
            'alltime': get_daily_solved_stats(submissions_data['result'], 'alltime')
        }
        stats['rating_history'] = rating_history
        stats['heatmap_data'] = get_submission_heatmap(submissions_data['result'])
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/compare', methods=['POST'])
def compare_handles():
    try:
        handles = request.json.get('handles', [])
        if not handles:
            return jsonify({"error": "No handles provided"}), 400

        # Fetch data for all handles in parallel
        all_data = []
        for handle in handles:
            # Get user info and submissions
            user_response = requests.get(f"{CODEFORCES_API_URL}/user.info?handles={handle}")
            submissions_response = requests.get(f"{CODEFORCES_API_URL}/user.status?handle={handle}")
            
            if user_response.status_code != 200 or submissions_response.status_code != 200:
                continue
                
            user_data = user_response.json()
            submissions_data = submissions_response.json()
            
            if user_data['status'] != 'OK' or submissions_data['status'] != 'OK':
                continue
                
            # Get today's stats
            today = datetime.now(dhaka_tz).replace(hour=0, minute=0, second=0, microsecond=0)
            today_seconds = int(today.timestamp())
            
            today_stats = {
                'total_submissions': 0,
                'accepted': 0,
                'solved_problems': set(),
                'last_submission': None
            }
            
            # Process today's submissions
            for submission in submissions_data['result']:
                if submission['creationTimeSeconds'] >= today_seconds:
                    today_stats['total_submissions'] += 1
                    if submission['verdict'] == 'OK':
                        today_stats['accepted'] += 1
                        problem_id = f"{submission['problem']['contestId']}{submission['problem']['index']}"
                        today_stats['solved_problems'].add(problem_id)
                    
                    # Track last submission
                    if not today_stats['last_submission'] or submission['creationTimeSeconds'] > today_stats['last_submission']['creationTimeSeconds']:
                        today_stats['last_submission'] = submission
            
            # Get all-time stats
            all_time_stats = get_all_time_stats(submissions_data['result'])
            
            # Calculate last active status
            last_active = None
            if submissions_data['result']:
                last_submission = max(submissions_data['result'], key=lambda x: x['creationTimeSeconds'])
                last_active = {
                    'time': last_submission['creationTimeSeconds'],
                    'problem': {
                        'name': last_submission['problem']['name'],
                        'contestId': last_submission['problem']['contestId'],
                        'index': last_submission['problem']['index']
                    },
                    'verdict': last_submission['verdict']
                }
            
            all_data.append({
                'handle': handle,
                'user_info': user_data['result'][0],
                'today_stats': {
                    'total_submissions': today_stats['total_submissions'],
                    'accepted': today_stats['accepted'],
                    'solved_problems': len(today_stats['solved_problems']),
                    'last_submission': today_stats['last_submission']
                },
                'all_time_stats': {
                    'total_solved': len(all_time_stats['solved_problems']),
                    'total_submissions': all_time_stats['total_submissions'],
                    'streak': all_time_stats['streak'],
                    'avg_attempts_per_ac': all_time_stats['avg_attempts_per_ac'],
                    'problem_ratings': all_time_stats['problem_ratings']
                },
                'last_active': last_active
            })
        
        return jsonify(all_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/heatmap/<handle>/<int:year>')
def get_heatmap_data(handle, year):
    try:
        # Get user submissions
        response = requests.get(f"{CODEFORCES_API_URL}/user.status?handle={handle}")
        if response.status_code != 200:
            return jsonify({"error": "Failed to fetch submission data"}), 400
        
        submissions_data = response.json()
        if submissions_data['status'] != 'OK':
            return jsonify({"error": "Failed to fetch submissions"}), 404

        heatmap_data = get_submission_heatmap(submissions_data['result'], year)
        return jsonify(heatmap_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True) 