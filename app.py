from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
import datetime
import requests
from bs4 import BeautifulSoup
import pyttsx3
import speech_recognition as sr
import os
import threading

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# Database Models
class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(200), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Reminder(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.String(200), nullable=False)
    time = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

# Initialize database
with app.app_context():
    db.create_all()

# Text-to-Speech Engine
engine = pyttsx3.init()
engine.setProperty('rate', 150)
voices = engine.getProperty('voices')
engine.setProperty('voice', voices[1].id)  # Female voice

def speak(text):
    def run():
        engine.say(text)
        engine.runAndWait()
    thread = threading.Thread(target=run)
    thread.start()

# Speech Recognition
def recognize_speech():
    r = sr.Recognizer()
    with sr.Microphone() as source:
        audio = r.listen(source)
    try:
        return r.recognize_google(audio)
    except:
        return ""

# Web Search Functions
def search_google(query):
    url = f"https://www.google.com/search?q={query}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.text, 'html.parser')
    results = []
    for g in soup.find_all('div', class_='tF2Cxc'):
        title = g.find('h3').text
        link = g.find('a')['href']
        desc = g.find('div', class_='VwiC3b').text
        results.append({'title': title, 'link': link, 'desc': desc})
    return results[:3]

def search_wikipedia(query):
    url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={query}&format=json"
    response = requests.get(url)
    data = response.json()
    if data['query']['search']:
        page_id = data['query']['search'][0]['pageid']
        url = f"https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&pageids={page_id}&format=json"
        response = requests.get(url)
        data = response.json()
        return data['query']['pages'][str(page_id)]['extract'][:500] + "..."
    return "No results found."

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/tasks', methods=['GET', 'POST'])
def tasks():
    if request.method == 'POST':
        content = request.json.get('content')
        if content:
            new_task = Task(content=content)
            db.session.add(new_task)
            db.session.commit()
            return jsonify({'success': True, 'task': {'id': new_task.id, 'content': new_task.content}})
    
    tasks = Task.query.order_by(Task.created_at.desc()).all()
    return jsonify([{'id': t.id, 'content': t.content, 'completed': t.completed} for t in tasks])

@app.route('/tasks/<int:id>', methods=['PUT', 'DELETE'])
def task(id):
    task = Task.query.get_or_404(id)
    if request.method == 'PUT':
        task.completed = not task.completed
        db.session.commit()
        return jsonify({'success': True})
    elif request.method == 'DELETE':
        db.session.delete(task)
        db.session.commit()
        return jsonify({'success': True})

@app.route('/search', methods=['POST'])
def search():
    query = request.json.get('query')
    if not query:
        return jsonify({'error': 'No query provided'}), 400
    
    # Try Wikipedia first
    wiki_result = search_wikipedia(query)
    if "No results found" not in wiki_result:
        return jsonify({'source': 'wikipedia', 'result': wiki_result})
    
    # Then try Google
    google_results = search_google(query)
    if google_results:
        return jsonify({'source': 'google', 'results': google_results})
    
    return jsonify({'error': 'No results found'}), 404

@app.route('/speak', methods=['POST'])
def speak_text():
    text = request.json.get('text')
    if text:
        speak(text)
        return jsonify({'success': True})
    return jsonify({'error': 'No text provided'}), 400

@app.route('/listen', methods=['GET'])
def listen():
    text = recognize_speech()
    return jsonify({'text': text})

# Jokes API
jokes = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "What did one ocean say to the other ocean? Nothing, they just waved!",
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "What do you call a fake noodle? An impasta!",
    "Why couldn't the bicycle stand up by itself? It was two tired!",
    "How does a penguin build its house? Igloos it together!",
    "What do you call a bear with no teeth? A gummy bear!",
    "Why did the math book look sad? Because it had too many problems!",
    "What's orange and sounds like a parrot? A carrot!",
    "Why did the tomato turn red? Because it saw the salad dressing!"
]

@app.route('/joke', methods=['GET'])
def joke():
    return jsonify({'joke': jokes[datetime.datetime.now().second % len(jokes)]})

if __name__ == '__main__':
    app.run(debug=True)
