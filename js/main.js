console.log('Main JS loaded');

document.addEventListener('DOMContentLoaded', () => {
    // --- Homepage YouTube Content ---
    const youtubeContainer = document.getElementById('youtube-container');
    if (youtubeContainer) {
        fetch('data/youtube_content.json') // Path relative to index.html
            .then(response => {
                if (!response.ok) throw new Error('Failed to load youtube_content.json');
                return response.json();
            })
            .then(videos => {
                videos.forEach(video => {
                    const card = document.createElement('div');
                    card.classList.add('video-card');

                    const title = document.createElement('h3');
                    title.textContent = video.title;
                    card.appendChild(title);

                    const iframeContainer = document.createElement('div');
                    iframeContainer.classList.add('responsive-iframe-container');
                    const iframe = document.createElement('iframe');
                    iframe.src = video.embed_url;
                    iframe.title = video.title;
                    iframe.setAttribute('frameborder', '0');
                    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
                    iframe.setAttribute('allowfullscreen', '');
                    iframeContainer.appendChild(iframe);
                    card.appendChild(iframeContainer);

                    youtubeContainer.appendChild(card);

                    // Add VideoObject schema
                    const videoSchema = {
                        "@context": "https://schema.org",
                        "@type": "VideoObject",
                        "name": video.title,
                        "description": video.title, // Or a more detailed description if available
                        "thumbnailUrl": "", // Placeholder - ideally get from API or add to JSON
                        "uploadDate": new Date().toISOString(), // Placeholder - ideally actual date
                        "embedUrl": video.embed_url
                    };
                    if (video.type === "playlist") {
                        videoSchema.description = `Playlist: ${video.title}`;
                    }
                    const schemaScript = document.createElement('script');
                    schemaScript.type = 'application/ld+json';
                    schemaScript.textContent = JSON.stringify(videoSchema);
                    document.head.appendChild(schemaScript);
                });
            })
            .catch(error => {
                console.error('Error loading YouTube highlights:', error);
                if(youtubeContainer) youtubeContainer.innerHTML = '<p>Could not load featured videos.</p>';
            });
    }

    // --- Guidebook chapters functionality (modified for lesson media) ---
    const chaptersContainer = document.getElementById('guidebook-chapters-container');
    if (chaptersContainer) {
        Promise.all([
            fetch('../data/guidebook_chapters.json').then(res => {
                if (!res.ok) throw new Error('Failed to load guidebook_chapters.json');
                return res.json();
            }),
            fetch('../data/lesson_media.json').then(res => {
                if (!res.ok) throw new Error('Failed to load lesson_media.json');
                return res.json();
            })
        ])
        .then(([chapters, lessonMedia]) => {
            chapters.forEach(chapter => {
                const card = document.createElement('div');
                card.classList.add('chapter-card');
                const titleEl = document.createElement('h3');
                titleEl.textContent = chapter.title;
                card.appendChild(titleEl);

                const summaryEl = document.createElement('p');
                summaryEl.textContent = chapter.summary;
                card.appendChild(summaryEl);

                if (chapter.audio_url) {
                    const audioLink = document.createElement('a');
                    audioLink.href = `../${chapter.audio_url}`;
                    audioLink.textContent = 'Listen to Main Audio Summary';
                    audioLink.classList.add('main-audio-link');
                    card.appendChild(audioLink);
                }

                const relatedMedia = lessonMedia.filter(media => media.chapter_id === chapter.id);
                if (relatedMedia.length > 0) {
                    const mediaSection = document.createElement('div');
                    mediaSection.classList.add('lesson-media-section');
                    relatedMedia.forEach(media => {
                        const mediaItemEl = document.createElement('div');
                        mediaItemEl.classList.add('lesson-media-item');

                        const mediaTitle = document.createElement('h4');
                        mediaTitle.textContent = media.title;
                        mediaItemEl.appendChild(mediaTitle);

                        let mediaSchema = { "@context": "https://schema.org" };

                        if (media.type === 'video' && media.url.includes('youtube.com/embed')) {
                            const iframeContainer = document.createElement('div');
                            iframeContainer.classList.add('responsive-iframe-container');
                            const iframe = document.createElement('iframe');
                            iframe.src = media.url;
                            iframe.title = media.title;
                            iframe.setAttribute('frameborder', '0');
                            iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
                            iframe.setAttribute('allowfullscreen', '');
                            iframeContainer.appendChild(iframe);
                            mediaItemEl.appendChild(iframeContainer);

                            mediaSchema["@type"] = "VideoObject";
                            mediaSchema["name"] = media.title;
                            mediaSchema["description"] = media.title;
                            mediaSchema["embedUrl"] = media.url;
                        } else if (media.type === 'audio') {
                            const audioElement = document.createElement('audio');
                            audioElement.controls = true;
                            audioElement.src = `../${media.url}`;
                            mediaItemEl.appendChild(audioElement);

                            mediaSchema["@type"] = "AudioObject";
                            mediaSchema["name"] = media.title;
                            mediaSchema["description"] = media.title;
                            mediaSchema["contentUrl"] = `../${media.url}`;
                        }
                        mediaSection.appendChild(mediaItemEl);

                        if(mediaSchema["@type"]){
                            const schemaScript = document.createElement('script');
                            schemaScript.type = 'application/ld+json';
                            schemaScript.textContent = JSON.stringify(mediaSchema);
                            document.head.appendChild(schemaScript);
                        }
                    });
                    card.appendChild(mediaSection);
                }
                chaptersContainer.appendChild(card);

                const chapterSchemaScript = document.createElement('script');
                chapterSchemaScript.type = 'application/ld+json';
                chapterSchemaScript.textContent = JSON.stringify({
                    "@context": "https://schema.org", "@type": "Article",
                    "headline": chapter.title, "description": chapter.summary,
                    "mainEntityOfPage": { "@type": "WebPage", "@id": window.location.href },
                    "author": { "@type": "Organization", "name": "NYS Drive Prep" },
                    "publisher": { "@type": "Organization", "name": "NYS Drive Prep", "logo": { "@type": "ImageObject", "url": "https://yourdomain.com/img/logo.png" } }
                });
                document.head.appendChild(chapterSchemaScript);
            });
        })
        .catch(error => {
            console.error('Error loading guidebook content:', error);
            if(chaptersContainer) chaptersContainer.innerHTML = '<p>Error loading guidebook chapters or media. Please try again later.</p>';
        });
    }

    // --- MCQ Quiz functionality ---
    const quizOptionsContainer = document.getElementById('quiz-options-container');
    const quizInterface = document.getElementById('quiz-interface');

    if (quizOptionsContainer && quizInterface) {
        let allQuizzesInfo = [];
        let currentQuizData = null;
        let currentQuestionIndex = 0;
        let score = 0;

        let quizTitleEl, questionTextEl, optionsContainerEl, submitAnswerBtn, feedbackContainerEl, currentScoreEl, totalQuestionsEl, nextQuestionBtn;
        const quizSelectionSection = document.getElementById('quiz-selection');

        function updateQuizElementReferences() {
            quizTitleEl = document.getElementById('quiz-title');
            questionTextEl = document.getElementById('question-text');
            optionsContainerEl = document.getElementById('options-container');
            submitAnswerBtn = document.getElementById('submit-answer-btn');
            feedbackContainerEl = document.getElementById('feedback-container');
            currentScoreEl = document.getElementById('current-score');
            totalQuestionsEl = document.getElementById('total-questions');
            nextQuestionBtn = document.getElementById('next-question-btn');

            if(submitAnswerBtn) submitAnswerBtn.addEventListener('click', handleSubmitAnswer);
            if(nextQuestionBtn) nextQuestionBtn.addEventListener('click', handleNextQuestion);
        }
        updateQuizElementReferences(); // Initial call to get references

        function loadQuizList() {
            fetch('../data/quizzes.json')
                .then(response => response.json())
                .then(quizzes => {
                    allQuizzesInfo = quizzes;
                    if(quizOptionsContainer) quizOptionsContainer.innerHTML = '';
                    quizzes.forEach(quiz => {
                        const card = document.createElement('div');
                        card.classList.add('quiz-option-card');
                        card.innerHTML = `<h3>${quiz.title}</h3><p>${quiz.description}</p>`;
                        card.dataset.filename = quiz.fileName;
                        card.dataset.quizid = quiz.id;
                        card.addEventListener('click', () => startQuiz(quiz.fileName, quiz.id));
                        quizOptionsContainer.appendChild(card);
                    });
                })
                .catch(error => {
                    console.error('Error loading quiz list:', error);
                    if(quizOptionsContainer) quizOptionsContainer.innerHTML = '<p>Error loading quizzes. Please try again later.</p>';
                });
        }

        function startQuiz(fileName, quizId) {
            const selectedQuizInfo = allQuizzesInfo.find(q => q.id === quizId);
            if (!document.getElementById('quiz-title')) {
                 reinitializeQuizInterface();
            }
            updateQuizElementReferences();

            fetch(`../data/${fileName}`)
                .then(response => response.json())
                .then(data => {
                    currentQuizData = data;
                    currentQuizData.fileName = fileName;
                    currentQuestionIndex = 0;
                    score = 0;

                    if (selectedQuizInfo) quizTitleEl.textContent = selectedQuizInfo.title;
                    else quizTitleEl.textContent = "Quiz";

                    totalQuestionsEl.textContent = currentQuizData.questions.length;
                    currentScoreEl.textContent = score;

                    if(quizSelectionSection) quizSelectionSection.style.display = 'none';
                    if(quizInterface) quizInterface.style.display = 'block';

                    displayQuestion();
                    addQuizSchema(selectedQuizInfo);
                })
                .catch(error => {
                    console.error('Error loading quiz questions:', error);
                    if(quizInterface) quizInterface.innerHTML = '<p>Error loading quiz. Please try again.</p>';
                });
        }

        function displayQuestion() {
            const question = currentQuizData.questions[currentQuestionIndex];
            questionTextEl.textContent = question.question;
            optionsContainerEl.innerHTML = '';

            question.options.forEach((option, index) => {
                const button = document.createElement('button');
                button.classList.add('option-btn');
                button.textContent = option;
                button.dataset.index = index;
                button.addEventListener('click', () => selectOption(button));
                optionsContainerEl.appendChild(button);
            });

            feedbackContainerEl.innerHTML = '';
            feedbackContainerEl.className = 'feedback-container';
            submitAnswerBtn.style.display = 'block';
            nextQuestionBtn.style.display = 'none';
            submitAnswerBtn.disabled = true;

            optionsContainerEl.querySelectorAll('.option-btn').forEach(btn => btn.disabled = false);
            addQuestionSchema(question);
        }

        let selectedOptionButton = null;

        function selectOption(button) {
            if (selectedOptionButton) {
                selectedOptionButton.classList.remove('selected');
            }
            button.classList.add('selected');
            selectedOptionButton = button;
            submitAnswerBtn.disabled = false;
        }

        function handleSubmitAnswer() {
            if (selectedOptionButton === null) return;
            const selectedIndex = parseInt(selectedOptionButton.dataset.index);
            const question = currentQuizData.questions[currentQuestionIndex];

            optionsContainerEl.querySelectorAll('.option-btn').forEach(btn => btn.disabled = true);
            selectedOptionButton.classList.remove('selected');

            if (selectedIndex === question.correctAnswerIndex) {
                score++;
                feedbackContainerEl.textContent = `Correct! ${question.feedback}`;
                feedbackContainerEl.className = 'feedback-container correct';
            } else {
                feedbackContainerEl.textContent = `Incorrect. ${question.feedback}`;
                feedbackContainerEl.className = 'feedback-container incorrect';
                optionsContainerEl.querySelector(`button[data-index='${question.correctAnswerIndex}']`).classList.add('correct-answer');
            }

            currentScoreEl.textContent = score;
            submitAnswerBtn.style.display = 'none';
            nextQuestionBtn.style.display = 'block';
            selectedOptionButton = null;

            if (currentQuestionIndex === currentQuizData.questions.length - 1) {
                nextQuestionBtn.textContent = 'Show Results';
            } else {
                nextQuestionBtn.textContent = 'Next Question';
            }
        }

        function handleNextQuestion() {
            currentQuestionIndex++;
            if (currentQuestionIndex < currentQuizData.questions.length) {
                displayQuestion();
            } else {
                displayFinalScore();
            }
        }

        function displayFinalScore() {
            quizInterface.innerHTML = `
                <div id="quiz-results">
                    <h2>Quiz Complete!</h2>
                    <p>Your final score is ${score} out of ${currentQuizData.questions.length}.</p>
                    <button id="try-again-btn">Try This Quiz Again</button>
                    <button id="choose-another-quiz-btn">Choose Another Quiz</button>
                </div>
            `;
            document.getElementById('try-again-btn').addEventListener('click', () => {
                const quizToRestart = allQuizzesInfo.find(q => q.fileName === currentQuizData.fileName);
                if (quizToRestart) startQuiz(currentQuizData.fileName, quizToRestart.id);
            });
            document.getElementById('choose-another-quiz-btn').addEventListener('click', () => {
                if(quizInterface) quizInterface.style.display = 'none';
                if(quizSelectionSection) quizSelectionSection.style.display = 'block';
                reinitializeQuizInterface();
                loadQuizList();
            });
        }

        function reinitializeQuizInterface() {
            const originalQuizInterfaceHTML = `
                <h2 id="quiz-title"></h2>
                <div id="question-container">
                  <p id="question-text"></p>
                  <div id="options-container"></div>
                  <button id="submit-answer-btn">Submit Answer</button>
                </div>
                <div id="feedback-container"></div>
                <div id="score-container">Score: <span id="current-score">0</span> / <span id="total-questions">0</span></div>
                <button id="next-question-btn" style="display:none;">Next Question</button>
            `;
            if(quizInterface) quizInterface.innerHTML = originalQuizInterfaceHTML;
            updateQuizElementReferences();
        }

        function addQuizSchema(quizInfo) {
            if (!quizInfo) return;
            const schemaScriptId = 'quiz-schema';
            document.getElementById(schemaScriptId)?.remove();
            const schemaScript = document.createElement('script');
            schemaScript.type = 'application/ld+json';
            schemaScript.id = schemaScriptId;
            schemaScript.textContent = JSON.stringify({
                "@context": "https://schema.org", "@type": "Quiz",
                "name": quizInfo.title, "description": quizInfo.description,
                "hasPart": currentQuizData.questions.map((q, index) => ({
                    "@type": "Question", "name": `Question ${index + 1}`, "text": q.question
                }))
            });
            document.head.appendChild(schemaScript);
        }

        function addQuestionSchema(question) {
            const schemaScriptId = 'current-question-schema';
            document.getElementById(schemaScriptId)?.remove();
            const schemaScript = document.createElement('script');
            schemaScript.type = 'application/ld+json';
            schemaScript.id = schemaScriptId;
            schemaScript.textContent = JSON.stringify({
                "@context": "https://schema.org", "@type": "Question",
                "text": question.question, "name": question.question.substring(0,50) + "...",
                "acceptedAnswer": { "@type": "Answer", "text": question.options[question.correctAnswerIndex] },
                "suggestedAnswer": question.options.map(opt => ({ "@type": "Answer", "text": opt }))
            });
            document.head.appendChild(schemaScript);
        }

        if(quizOptionsContainer) loadQuizList();
    }

    // --- Tips Page BlogPosting Schema ---
    const tipArticles = document.querySelectorAll('article.tip-article');
    if (tipArticles.length > 0) {
        tipArticles.forEach(article => {
            const titleElement = article.querySelector('h2');
            const firstParagraph = article.querySelector('p');
            const articleId = article.id;

            if (titleElement && firstParagraph && articleId) {
                const title = titleElement.textContent.trim();
                const description = firstParagraph.textContent.trim().substring(0, 150) + "..."; // Truncate for description

                const schema = {
                    "@context": "https://schema.org",
                    "@type": "BlogPosting", // Or Article, TechArticle etc.
                    "headline": title,
                    "description": description,
                    "mainEntityOfPage": {
                        "@type": "WebPage",
                        "@id": `${window.location.href}#${articleId}`
                    },
                    "author": {
                        "@type": "Organization", // Or Person
                        "name": "NYS Drive Prep" // Placeholder
                    },
                    "publisher": {
                        "@type": "Organization",
                        "name": "NYS Drive Prep", // Placeholder
                        "logo": {
                            "@type": "ImageObject",
                            "url": "https://yourdomain.com/img/logo.png" // Placeholder
                        }
                    },
                    "datePublished": "2024-01-01", // Placeholder date
                    "image": "" // Placeholder, ideally URL of a relevant image for the article
                };

                const schemaScript = document.createElement('script');
                schemaScript.type = 'application/ld+json';
                schemaScript.textContent = JSON.stringify(schema);
                document.head.appendChild(schemaScript);
            }
        });
    }
});
