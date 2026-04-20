# ⚡ FlashForge

<div align="center">
  <h3>Transform any PDF into an AI-powered spaced-repetition flashcard deck instantly.</h3>
  <p>Built with Next.js and Google's Generative AI.</p>
</div>

---

## 🌟 Overview

**FlashForge** is a full-stack educational tool designed to supercharge learning. By leveraging advanced AI models and the proven SM-2 spaced repetition algorithm, it automatically extracts knowledge from PDF documents and generates high-quality flashcards. Say goodbye to manual flashcard creation and hello to optimized study sessions!

## ✨ Features

- **📄 Smart PDF Parsing:** Upload any PDF document, and the engine will seamlessly extract text and core concepts.
- **🧠 AI-Powered Content Generation:** Integrates with **Google's Generative AI** to intelligently process text and generate concise, relevant flashcards while filtering out fluff.
- **🔄 Spaced Repetition (SM-2 Algorithm):** Features a robust study mode utilizing the SM-2 algorithm to optimize memory retention, ensuring you review cards at the perfect time.
- **🎨 Beautiful & Responsive UI:** A modern, clean, and interactive interface built with React and Next.js, complete with progress tracking and intuitive deck management.

## 🛠️ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/)
- **Frontend:** React
- **AI Integration:** `@google/genai` (Google Generative AI SDK)
- **PDF Processing:** `pdf-parse`
- **State Management & Utilities:** `uuid`

## 🚀 Getting Started

Follow these steps to set up the project locally:

### 1. Clone the repository

```bash
git clone https://github.com/ayush-shankhdhar/flashCard.git
cd flashCard
```

### 2. Install dependencies

Make sure you have Node.js installed, then run:

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory and add your Google Gemini API key:

```env
GOOGLE_GENAI_API_KEY=your_google_api_key_here
```

*(Note: You can obtain an API key from [Google AI Studio](https://aistudio.google.com/).)*

### 4. Run the Development Server

Start the app locally:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start building your flashcard decks!

## 📂 Project Structure

- `src/app/` - Next.js App Router pages and API routes (contains the core AI generation logic).
- `src/components/` - Reusable React components (Upload Zone, Flashcard viewer, etc.).
- `src/lib/` or `src/utils/` - Utility functions, including the spaced repetition algorithm and PDF parsing logic.

## 🤝 Contributing

Contributions are welcome! If you'd like to improve the flashcard generation prompts, enhance the study algorithm, or build new UI features, feel free to open an issue or submit a Pull Request.

## 📜 License

This project is open-source and available under the MIT License.
