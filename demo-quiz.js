// Multi-Question Demo Quiz
const demoQuestions = [
  {
    type: 'multiple-choice',
    title: 'Multiple Choice Question',
    question: '<strong>Question 1:</strong> What is the capital of France?',
    answers: [
      { text: 'A) London', correct: false },
      { text: 'B) Paris', correct: true },
      { text: 'C) Berlin', correct: false },
      { text: 'D) Madrid', correct: false }
    ],
    explanation: 'Paris is the capital and most populous city of France.'
  },
  {
    type: 'fill-in-blank',
    title: 'Fill in the Blank',
    question: '<strong>Question 2:</strong> The process by which plants make food using sunlight is called _______.',
    correctAnswer: 'photosynthesis',
    explanation: 'Photosynthesis is the process plants use to convert light energy into chemical energy.'
  },
  {
    type: 'short-answer',
    title: 'Short Answer Question',
    question: '<strong>Question 3:</strong> Briefly explain what DNA stands for and its function.',
    answer: 'DNA stands for Deoxyribonucleic Acid. It is a molecule that carries genetic instructions for the development, functioning, growth, and reproduction of all known organisms.',
    explanation: 'AI generated a concise answer covering the acronym and main function.'
  },
  {
    type: 'essay',
    title: 'Essay Question',
    question: '<strong>Question 4:</strong> Discuss the impact of climate change on global ecosystems.',
    answer: 'Climate change significantly impacts global ecosystems through rising temperatures, altered precipitation patterns, and increased frequency of extreme weather events. These changes affect biodiversity, as many species struggle to adapt to rapidly shifting conditions. Ecosystems such as coral reefs face bleaching and death due to warming oceans, while polar regions experience habitat loss for species like polar bears.\n\nAdditionally, climate change disrupts food chains and migration patterns, leading to cascading effects throughout ecosystems. Agricultural systems are also affected, with changes in crop yields and growing seasons threatening food security. Addressing climate change requires global cooperation to reduce emissions and implement sustainable practices.',
    explanation: 'AI generated a comprehensive essay with multiple paragraphs and supporting details.'
  }
];

let currentQuestionIndex = 0;
let demoRunning = false;

function renderQuestion(index) {
  const question = demoQuestions[index];
  const content = document.getElementById('demoQuestionContent');
  const title = document.getElementById('demoQuestionTitle');
  const currentQ = document.getElementById('currentQ');

  title.textContent = question.title;
  currentQ.textContent = index + 1;

  let html = `<p style="margin: 15px 0; font-size: 15px; color: #334155; line-height: 1.6;">${question.question}</p>`;

  if (question.type === 'multiple-choice') {
    html += '<div class="demo-answers">';
    question.answers.forEach((answer, i) => {
      const hint = answer.correct ? '<span class="demo-ai-hint">✨ AI Suggestion</span>' : '';
      html += `
        <label class="demo-answer" data-correct="${answer.correct}">
          <input type="radio" name="demo-current" value="${i}">
          <span>${answer.text}</span>
          ${hint}
        </label>
      `;
    });
    html += '</div>';
  } else if (question.type === 'fill-in-blank') {
    html += '<input type="text" class="demo-input" id="demoInput" placeholder="Type your answer..." readonly>';
  } else if (question.type === 'short-answer') {
    html += '<textarea class="demo-textarea" id="demoTextarea" placeholder="Type your answer..." readonly></textarea>';
  } else if (question.type === 'essay') {
    html += '<textarea class="demo-textarea" id="demoTextarea" placeholder="Type your answer..." readonly style="min-height: 180px;"></textarea>';
  }

  content.innerHTML = html;
}

function animateAnswer(index) {
  const question = demoQuestions[index];

  if (question.type === 'multiple-choice') {
    setTimeout(() => {
      const correctAnswer = document.querySelector('.demo-answer[data-correct="true"]');
      const correctRadio = correctAnswer.querySelector('input[type="radio"]');
      correctRadio.checked = true;
      correctAnswer.classList.add('correct-selected');

      showExplanation(question.explanation);
    }, 1000);
  } else if (question.type === 'fill-in-blank') {
    const input = document.getElementById('demoInput');
    typeText(input, question.correctAnswer, () => {
      input.classList.add('filled');
      showExplanation(question.explanation);
    });
  } else if (question.type === 'short-answer' || question.type === 'essay') {
    const textarea = document.getElementById('demoTextarea');
    typeText(textarea, question.answer, () => {
      textarea.classList.add('filled');
      showExplanation(question.explanation);
    });
  }
}

function typeText(element, text, callback) {
  let i = 0;
  element.value = '';

  const typing = setInterval(() => {
    if (i < text.length) {
      element.value += text.charAt(i);
      element.scrollTop = element.scrollHeight; // Auto-scroll
      i++;
    } else {
      clearInterval(typing);
      if (callback) callback();
    }
  }, 20); // Type speed
}

function showExplanation(text) {
  const content = document.getElementById('demoQuestionContent');
  const explanation = document.createElement('div');
  explanation.className = 'demo-explanation';
  explanation.innerHTML = `
    <strong style="color: #10b981;">✓ Complete!</strong>
    <p style="margin: 8px 0 0 0; font-size: 13px; color: #64748b;">${text}</p>
  `;
  content.appendChild(explanation);

  // Auto-advance to next question after 2 seconds
  if (currentQuestionIndex < demoQuestions.length - 1) {
    setTimeout(() => {
      nextQuestion();
    }, 2000);
  } else {
    // Last question - show completion screen after 2 seconds
    setTimeout(() => {
      nextQuestion();
    }, 2000);
  }
}

function nextQuestion() {
  currentQuestionIndex++;

  if (currentQuestionIndex < demoQuestions.length) {
    renderQuestion(currentQuestionIndex);

    setTimeout(() => {
      animateAnswer(currentQuestionIndex);
    }, 500);
  } else {
    // Demo complete
    const btn = document.getElementById('demoSubmitBtn');
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 8px;">
        <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path>
        <path d="M12 9l0 3l2 2"></path>
      </svg>
      Watch Again
    `;
    btn.style.background = '#10b981';
    btn.style.display = 'flex';

    document.getElementById('demoQuestionTitle').textContent = 'Demo Complete! 🎉';
    document.getElementById('demoQuestionContent').innerHTML = `
      <p style="margin: 15px 0; font-size: 15px; color: #334155; line-height: 1.6;">
        <strong>You've seen how StudyFlow handles:</strong>
      </p>
      <ul style="margin: 10px 0 10px 30px; color: #334155; line-height: 2;">
        <li>✓ Multiple choice questions with AI suggestions</li>
        <li>✓ Fill-in-the-blank questions</li>
        <li>✓ Short answer responses</li>
        <li>✓ Long essay questions</li>
      </ul>
      <p style="margin: 15px 0; font-size: 14px; color: #64748b;">
        Ready to ace your quizzes? Download the extension and get started!
      </p>
    `;

    demoRunning = false;
  }
}

// Initialize demo
document.addEventListener('DOMContentLoaded', function() {
  const demoBtn = document.getElementById('demoSubmitBtn');

  if (demoBtn) {
    renderQuestion(0); // Show first question

    demoBtn.addEventListener('click', function() {
      if (!demoRunning) {
        // Start or restart demo
        currentQuestionIndex = 0;
        demoRunning = true;
        renderQuestion(0);

        // Hide button during demo
        this.style.display = 'none';
        this.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

        // Start the slideshow
        setTimeout(() => {
          animateAnswer(0);
        }, 500);
      }
    });
  }
});
