from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
import time
import os

app = Flask(__name__)
CORS(app)

# 🔐 Configure ta clé API OpenAI ici (ou mets-la dans une variable d'environnement)
openai.api_key = "# API KEY"  # Remplace par ta vraie clé

# Base de connaissances locale pour les questions simples (optionnel)
knowledge_base = {
    "math": "Les mathématiques sont essentielles en ingénierie.",
    "physique": "La physique régit le mouvement des avions.",
    "programmation": "Python est parfait pour l'IA.",
    "aviation": "Le CH-01 est ton avion électrique.",
    "dieu": "Dieu est avec toi dans tous tes projets."
}

@app.route('/analyze', methods=['POST'])
def analyze():
    data = request.get_json()
    question = data.get('question', '')
    media = data.get('media', [])
    deep = data.get('deepThink', False)
    web = data.get('webSearch', False)
    lang = data.get('language', 'fr')

    start = time.time()

    # Si la question est très simple, on peut répondre depuis la base locale (économie)
    for key in knowledge_base:
        if key in question.lower():
            answer = knowledge_base[key]
            if deep:
                answer += " " + "Voici une analyse approfondie : (développement...)"
            elapsed = time.time() - start
            return jsonify({'answer': f"{answer}\n\n_⏱️ {elapsed:.1f}s_"})

    # Préparer le prompt pour OpenAI
    system_prompt = "Tu es CHARTECH AI, assistant spécialisé en aviation, programmation, mathématiques, physique. Tu aides Charles, un jeune Congolais de 16 ans qui construit un avion électrique (CH-01) et rêve d'étudier à Bauman. Réponds de manière utile et encourageante."
    if lang == 'fr':
        system_prompt += " Réponds en français."
    else:
        system_prompt += " Answer in English."

    # Gérer les médias (simplifié : on décrit juste qu'ils sont reçus)
    if media:
        media_desc = "\nMédias reçus : " + ", ".join([m['type'] for m in media])
        question += media_desc

    # Appel à OpenAI
    try:
        model = "gpt-3.5-turbo" if not deep else "gpt-4"
        response = openai.ChatCompletion.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": question}
            ],
            max_tokens=500 if deep else 200,
            temperature=0.7
        )
        answer = response.choices[0].message.content
    except Exception as e:
        answer = f"❌ Erreur OpenAI : {str(e)}"

    elapsed = time.time() - start
    answer += f"\n\n_⏱️ {elapsed:.1f}s_"
    return jsonify({'answer': answer})

if __name__ == '__main__':
    print("🚀 Serveur IA CHARTECH démarré sur http://127.0.0.1:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)