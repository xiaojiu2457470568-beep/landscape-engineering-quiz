const STORAGE_KEY = "landscape-engineering-quiz-v1";

const state = {
  mode: "objective",
  current: 0,
  objectiveAnswers: {},
  subjectiveAnswers: {},
  submitted: false,
  startedAt: Date.now(),
  reviewWrongOnly: false,
  hintedQuestions: new Set(),
};

const elements = {
  answeredCount: document.querySelector("#answered-count"),
  timer: document.querySelector("#timer"),
  questionGrid: document.querySelector("#question-grid"),
  questionView: document.querySelector("#question-view"),
  previousButton: document.querySelector("#previous-button"),
  hintButton: document.querySelector("#hint-button"),
  nextButton: document.querySelector("#next-button"),
  submitButton: document.querySelector("#submit-button"),
  resetButton: document.querySelector("#reset-button"),
  navKicker: document.querySelector("#nav-kicker"),
  navTitle: document.querySelector("#nav-title"),
  scoreNote: document.querySelector("#score-note"),
  navigator: document.querySelector(".navigator"),
  navigatorToggle: document.querySelector("#navigator-toggle"),
  resultPanel: document.querySelector("#result-panel"),
  scoreValue: document.querySelector("#score-value"),
  resultTitle: document.querySelector("#result-title"),
  resultDetail: document.querySelector("#result-detail"),
  resultMetrics: document.querySelector("#result-metrics"),
  reviewWrongButton: document.querySelector("#review-wrong-button"),
  retryButton: document.querySelector("#retry-button"),
  dialogBackdrop: document.querySelector("#dialog-backdrop"),
  dialogMessage: document.querySelector("#dialog-message"),
  dialogCancel: document.querySelector("#dialog-cancel"),
  dialogConfirm: document.querySelector("#dialog-confirm"),
  modeTabs: [...document.querySelectorAll(".mode-tab")],
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return;
    state.objectiveAnswers = saved.objectiveAnswers || {};
    state.subjectiveAnswers = saved.subjectiveAnswers || {};
    state.startedAt = saved.startedAt || Date.now();
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      objectiveAnswers: state.objectiveAnswers,
      subjectiveAnswers: state.subjectiveAnswers,
      startedAt: state.startedAt,
    }),
  );
}

function currentList() {
  if (state.mode === "subjective") return quizData.subjective;
  if (state.reviewWrongOnly && state.submitted) {
    return quizData.objective.filter(
      (question) => state.objectiveAnswers[question.id] !== question.answer,
    );
  }
  return quizData.objective;
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updateTimer() {
  elements.timer.textContent = formatTime(Date.now() - state.startedAt);
}

function updateStatus() {
  const answered = Object.keys(state.objectiveAnswers).length;
  elements.answeredCount.textContent = `${answered} / ${quizData.objective.length}`;
}

function setCurrent(index) {
  const list = currentList();
  state.current = Math.min(Math.max(index, 0), Math.max(list.length - 1, 0));
  closeMobileNavigator();
  render();
}

function isMobileLayout() {
  return window.matchMedia("(max-width: 860px)").matches;
}

function setMobileNavigator(open) {
  if (!isMobileLayout()) {
    elements.navigator.classList.remove("mobile-collapsed");
    elements.navigatorToggle.setAttribute("aria-expanded", "true");
    return;
  }

  elements.navigator.classList.toggle("mobile-collapsed", !open);
  elements.navigatorToggle.textContent = open ? "⌃" : "⌄";
  elements.navigatorToggle.title = open ? "收起题目导航" : "展开题目导航";
  elements.navigatorToggle.setAttribute("aria-label", elements.navigatorToggle.title);
  elements.navigatorToggle.setAttribute("aria-expanded", String(open));
}

function closeMobileNavigator() {
  if (isMobileLayout()) setMobileNavigator(false);
}

function renderNavigator() {
  const list = currentList();
  elements.questionGrid.innerHTML = "";

  list.forEach((question, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "question-dot";
    button.textContent = String(index + 1);
    button.title = `${question.section}第${index + 1}题`;

    const answer =
      state.mode === "objective"
        ? state.objectiveAnswers[question.id]
        : state.subjectiveAnswers[question.id];
    if (answer !== undefined && answer !== "") button.classList.add("answered");
    if (index === state.current) button.classList.add("current");
    if (state.submitted && state.mode === "objective") {
      button.classList.remove("answered");
      button.classList.add(answer === question.answer ? "correct" : "wrong");
    }

    button.addEventListener("click", () => setCurrent(index));
    elements.questionGrid.append(button);
  });
}

function renderObjective(question, position, total) {
  const selected = state.objectiveAnswers[question.id];
  const hinted = state.hintedQuestions.has(question.id);
  const optionLetters = ["A", "B", "C", "D"];
  const options = question.options
    .map((option, index) => {
      const classes = ["option"];
      if (selected === index) classes.push("selected");
      if (state.submitted && question.answer === index) classes.push("correct-answer");
      if (state.submitted && selected === index && selected !== question.answer) {
        classes.push("wrong-answer");
      }
      return `
        <button class="${classes.join(" ")}" type="button" data-option="${index}" ${state.submitted ? "disabled" : ""}>
          <span class="option-key">${optionLetters[index] || index + 1}</span>
          <span>${option}</span>
        </button>
      `;
    })
    .join("");

  const feedback = state.submitted
    ? `
      <div class="answer-feedback ${selected === question.answer ? "" : "wrong"}">
        ${selected === question.answer ? "回答正确。" : `回答错误。正确答案是 ${optionLetters[question.answer]}：${question.options[question.answer]}。`}
      </div>
    `
    : "";
  const hint = hinted && !state.submitted
    ? `
      <div class="answer-hint">
        <strong>答案提示</strong>
        <span>${optionLetters[question.answer]}：${question.options[question.answer]}</span>
      </div>
    `
    : "";

  elements.questionView.innerHTML = `
    <article class="question-content">
      <div class="question-meta">
        <span class="question-type">${question.section}</span>
        <span>第 ${position + 1} 题 / 共 ${total} 题</span>
      </div>
      <h2>${question.text}</h2>
      <div class="options">${options}</div>
      ${hint}
      ${feedback}
    </article>
  `;
  elements.hintButton.textContent = hinted ? "收起提示" : "提示";

  if (!state.submitted) {
    elements.questionView.querySelectorAll("[data-option]").forEach((button) => {
      button.addEventListener("click", () => {
        state.objectiveAnswers[question.id] = Number(button.dataset.option);
        saveState();
        updateStatus();
        renderNavigator();
        renderQuestion();
      });
    });
  }
}

function renderSubjective(question, position, total) {
  const value = state.subjectiveAnswers[question.id] || "";
  elements.questionView.innerHTML = `
    <article class="question-content">
      <div class="question-meta">
        <span class="question-type">${question.section}</span>
        <span>第 ${position + 1} 题 / 共 ${total} 题</span>
      </div>
      <h2>${question.text}</h2>
      <textarea class="subjective-answer" id="subjective-answer" placeholder="在这里整理你的答案……">${value}</textarea>
      <details class="reference-answer">
        <summary>展开参考答案</summary>
        <p>${question.answer}</p>
      </details>
    </article>
  `;

  elements.questionView
    .querySelector("#subjective-answer")
    .addEventListener("input", (event) => {
      state.subjectiveAnswers[question.id] = event.target.value;
      saveState();
      renderNavigator();
    });
}

function renderQuestion() {
  const list = currentList();
  if (!list.length) {
    elements.questionView.innerHTML = `
      <div class="question-content">
        <span class="question-type">错题回顾</span>
        <h2>本次没有错题。</h2>
      </div>
    `;
    elements.previousButton.disabled = true;
    elements.hintButton.disabled = true;
    elements.nextButton.disabled = true;
    return;
  }

  const question = list[state.current];
  if (state.mode === "objective") {
    renderObjective(question, state.current, list.length);
  } else {
    renderSubjective(question, state.current, list.length);
  }

  elements.previousButton.disabled = state.current === 0;
  elements.hintButton.disabled = false;
  elements.nextButton.disabled = state.current === list.length - 1;
}

function renderMode() {
  const subjective = state.mode === "subjective";
  elements.modeTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.mode === state.mode);
  });
  elements.navKicker.textContent = subjective ? "参考答案对照" : "自动评分";
  elements.navTitle.textContent = subjective ? "练习导航" : state.reviewWrongOnly ? "错题导航" : "题目导航";
  elements.scoreNote.textContent = subjective
    ? "主观题填写内容会自动保存在当前浏览器。"
    : "45 道客观题等权换算为 100 分。";
  elements.submitButton.hidden = subjective || state.submitted;
  elements.hintButton.hidden = subjective || state.submitted;
}

function render() {
  renderMode();
  renderNavigator();
  renderQuestion();
  updateStatus();
}

function calculateResult() {
  const total = quizData.objective.length;
  const correct = quizData.objective.filter(
    (question) => state.objectiveAnswers[question.id] === question.answer,
  ).length;
  const answered = Object.keys(state.objectiveAnswers).length;
  const wrong = total - correct;
  const score = Math.round((correct / total) * 100);
  const choiceCorrect = quizData.objective
    .filter((question) => question.type === "choice")
    .filter((question) => state.objectiveAnswers[question.id] === question.answer).length;
  const judgeCorrect = quizData.objective
    .filter((question) => question.type === "judge")
    .filter((question) => state.objectiveAnswers[question.id] === question.answer).length;

  return { total, correct, answered, wrong, score, choiceCorrect, judgeCorrect };
}

function showResult() {
  const result = calculateResult();
  state.submitted = true;
  state.reviewWrongOnly = false;
  state.current = 0;
  elements.scoreValue.textContent = String(result.score);
  elements.resultTitle.textContent =
    result.score >= 85 ? "掌握较好" : result.score >= 60 ? "达到及格线" : "需要继续复习";
  elements.resultDetail.textContent = `答对 ${result.correct} 题，答错或未答 ${result.wrong} 题，用时 ${elements.timer.textContent}。`;
  elements.resultMetrics.innerHTML = `
    <div class="result-metric"><strong>${result.correct}/${result.total}</strong><span>总正确数</span></div>
    <div class="result-metric"><strong>${result.choiceCorrect}/35</strong><span>选择题</span></div>
    <div class="result-metric"><strong>${result.judgeCorrect}/10</strong><span>判断题</span></div>
  `;
  elements.resultPanel.hidden = false;
  elements.resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  render();
}

function openSubmitDialog() {
  const unanswered = quizData.objective.length - Object.keys(state.objectiveAnswers).length;
  elements.dialogMessage.textContent = unanswered
    ? `还有 ${unanswered} 题未作答，未作答题将按错误计分。`
    : "全部题目已作答，提交后将显示成绩和逐题答案。";
  elements.dialogBackdrop.hidden = false;
}

function resetQuiz() {
  localStorage.removeItem(STORAGE_KEY);
  state.current = 0;
  state.objectiveAnswers = {};
  state.subjectiveAnswers = {};
  state.submitted = false;
  state.reviewWrongOnly = false;
  state.hintedQuestions.clear();
  state.startedAt = Date.now();
  elements.resultPanel.hidden = true;
  render();
}

elements.previousButton.addEventListener("click", () => setCurrent(state.current - 1));
elements.hintButton.addEventListener("click", () => {
  const question = currentList()[state.current];
  if (!question || state.mode !== "objective" || state.submitted) return;
  if (state.hintedQuestions.has(question.id)) {
    state.hintedQuestions.delete(question.id);
  } else {
    state.hintedQuestions.add(question.id);
  }
  renderQuestion();
});
elements.nextButton.addEventListener("click", () => setCurrent(state.current + 1));
elements.navigatorToggle.addEventListener("click", () => {
  const open = elements.navigatorToggle.getAttribute("aria-expanded") === "true";
  setMobileNavigator(!open);
});
elements.submitButton.addEventListener("click", openSubmitDialog);
elements.dialogCancel.addEventListener("click", () => {
  elements.dialogBackdrop.hidden = true;
});
elements.dialogConfirm.addEventListener("click", () => {
  elements.dialogBackdrop.hidden = true;
  showResult();
});
elements.resetButton.addEventListener("click", () => {
  if (window.confirm("确定清空全部答题记录并重新开始吗？")) resetQuiz();
});
elements.retryButton.addEventListener("click", resetQuiz);
elements.reviewWrongButton.addEventListener("click", () => {
  state.mode = "objective";
  state.reviewWrongOnly = true;
  state.current = 0;
  elements.resultPanel.hidden = true;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
});
elements.modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.mode = tab.dataset.mode;
    state.current = 0;
    state.reviewWrongOnly = false;
    closeMobileNavigator();
    render();
  });
});

window.addEventListener("resize", () => {
  if (isMobileLayout()) {
    setMobileNavigator(
      elements.navigatorToggle.getAttribute("aria-expanded") === "true",
    );
  } else {
    setMobileNavigator(true);
  }
});

loadState();
setMobileNavigator(!isMobileLayout());
render();
updateTimer();
setInterval(updateTimer, 1000);
