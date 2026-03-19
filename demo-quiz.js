// Multi-Question Demo Quiz
const demoQuestions = [
  {
    type: 'multiple-choice',
    title: 'Question 1',
    question: 'A patient with hypertension is prescribed a thiazide diuretic. Which of the following electrolyte imbalances should the nurse monitor for?',
    answers: [
      { text: 'Hypernatremia', correct: false },
      { text: 'Hypokalemia', correct: true },
      { text: 'Hypercalcemia', correct: false },
      { text: 'Hypermagnesemia', correct: false }
    ],
    explanation: 'AI identified and clicked the correct answer automatically.'
  },
  {
    type: 'fill-in-blank',
    title: 'Question 2',
    question: 'The normal range for adult heart rate is _______ to _______ beats per minute.',
    correctAnswer: '60 to 100',
    explanation: 'AI automatically filled in the correct answer for you.'
  },
  {
    type: 'short-answer',
    title: 'Question 3',
    question: 'List three signs and symptoms of hypoglycemia.',
    answer: 'Three signs and symptoms of hypoglycemia include: tremors/shakiness, diaphoresis (excessive sweating), and confusion or difficulty concentrating. Other symptoms may include tachycardia, hunger, and dizziness.',
    explanation: 'AI wrote a concise short answer response automatically.'
  },
  {
    type: 'essay',
    title: 'Question 4',
    question: 'Describe the pathophysiology of Type 2 Diabetes Mellitus and explain how it differs from Type 1 Diabetes.',
    answer: 'Type 2 Diabetes Mellitus (T2DM) is characterized by insulin resistance and relative insulin deficiency. In T2DM, the body\'s cells become resistant to insulin\'s effects, leading to impaired glucose uptake. The pancreas initially compensates by producing more insulin, but over time, beta cell function declines, resulting in insufficient insulin production.\n\nThis differs significantly from Type 1 Diabetes, which is an autoimmune condition where the immune system destroys pancreatic beta cells, resulting in absolute insulin deficiency. T2DM typically develops gradually in adults and is associated with obesity and lifestyle factors, while Type 1 usually presents acutely in children and young adults. T2DM can often be managed with lifestyle modifications and oral medications initially, whereas Type 1 requires insulin therapy from diagnosis.',
    explanation: 'AI wrote a full multi-paragraph essay response automatically.'
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
      const hint = answer.correct ? '<span class="demo-ai-hint">✨ Auto-Select</span>' : '';
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
        <strong>You've seen how StudyFlow automatically:</strong>
      </p>
      <ul style="margin: 10px 0 10px 30px; color: #334155; line-height: 2;">
        <li>✓ Clicks correct answers on multiple choice</li>
        <li>✓ Fills in blank fields</li>
        <li>✓ Writes short answer responses</li>
        <li>✓ Generates full essay answers</li>
      </ul>
      <p style="margin: 15px 0; font-size: 14px; color: #64748b;">
        Ready to automate your quizzes? Download the extension and get started!
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
