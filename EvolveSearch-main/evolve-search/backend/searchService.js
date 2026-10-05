// searchService.js - Multi-provider web search with intelligent mock fallback
const axios = require('axios');

function extractDomain(url) {
  try { return new URL(url).hostname.replace('www.', ''); }
  catch { return url; }
}

function normalizeResult(raw, source) {
  return {
    id: raw.link || raw.url || Math.random().toString(36),
    title: raw.title || 'Untitled',
    snippet: raw.snippet || raw.description || raw.body || '',
    url: raw.link || raw.url || '',
    source,
    type: 'TEXT',
    domain: extractDomain(raw.link || raw.url || ''),
    timestamp: Date.now()
  };
}

async function serpApiSearch(query) {
  if (!process.env.SERPAPI_KEY) throw new Error('SERPAPI_KEY not set');
  const response = await axios.get('https://serpapi.com/search', {
    params: { q: query, api_key: process.env.SERPAPI_KEY, engine: 'google', num: 10, hl: 'en' },
    timeout: 8000
  });
  return (response.data.organic_results || []).map(r => normalizeResult(r, 'serpapi'));
}

async function googleCustomSearch(query) {
  if (!process.env.GOOGLE_SEARCH_API_KEY) throw new Error('Google Search not configured');
  const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
    params: { key: process.env.GOOGLE_SEARCH_API_KEY, cx: process.env.GOOGLE_SEARCH_ENGINE_ID, q: query, num: 10 },
    timeout: 8000
  });
  return (response.data.items || []).map(r => normalizeResult(r, 'google'));
}

async function bingSearch(query) {
  if (!process.env.BING_SEARCH_KEY) throw new Error('Bing not configured');
  const response = await axios.get('https://api.bing.microsoft.com/v7.0/search', {
    params: { q: query, count: 10 },
    headers: { 'Ocp-Apim-Subscription-Key': process.env.BING_SEARCH_KEY },
    timeout: 8000
  });
  return (response.data.webPages?.value || []).map(r => ({
    ...normalizeResult({ link: r.url, ...r }, 'bing'), snippet: r.snippet
  }));
}

// Smart topic-aware mock with real URLs
const TOPIC_DB = {
  react: [
    { title: 'React – A JavaScript library for building user interfaces', snippet: 'React makes it painless to create interactive UIs. Design simple views for each state in your application, and React will efficiently update and render just the right components when your data changes.', url: 'https://react.dev', domain: 'react.dev' },
    { title: 'Getting Started with React - Official Docs', snippet: 'This page is an overview of the React documentation and related resources. Learn what React is all about on our homepage or in the tutorial. React lets you build user interfaces out of individual pieces called components.', url: 'https://react.dev/learn', domain: 'react.dev' },
    { title: 'React vs Vue vs Angular: Which to Choose in 2025 - freeCodeCamp', snippet: 'React uses a virtual DOM and JSX syntax, offering flexibility and a huge ecosystem. Vue is known for its gentle learning curve and two-way binding. Angular is a full MVC framework with TypeScript built-in.', url: 'https://www.freecodecamp.org/news/react-vs-vue-vs-angular', domain: 'freecodecamp.org' },
    { title: 'React Hooks Documentation - react.dev', snippet: 'Hooks are a new addition in React 16.8. They let you use state and other React features without writing a class. useState, useEffect, useContext, and more.', url: 'https://react.dev/reference/react', domain: 'react.dev' },
    { title: 'facebook/react - GitHub', snippet: 'React is a declarative, efficient, and flexible JavaScript library for building user interfaces. It lets you compose complex UIs from small and isolated pieces of code called "components".', url: 'https://github.com/facebook/react', domain: 'github.com' },
  ],
  vue: [
    { title: 'Vue.js - The Progressive JavaScript Framework', snippet: 'An approachable, performant and versatile framework for building web user interfaces. Vue builds on top of standard HTML, CSS, and JavaScript, and provides a declarative and component-based programming model.', url: 'https://vuejs.org', domain: 'vuejs.org' },
    { title: 'Introduction - Vue.js Official Guide', snippet: 'Vue (pronounced /vjuː/, like view) is a JavaScript framework for building user interfaces. It builds on top of standard HTML, CSS, and JavaScript and provides a declarative and component-based model.', url: 'https://vuejs.org/guide/introduction', domain: 'vuejs.org' },
  ],
  angular: [
    { title: 'Angular - The Modern Web Developer Platform', snippet: 'Angular is a platform and framework for building single-page client applications using HTML and TypeScript. Angular implements core and optional functionality as a set of TypeScript libraries that you import into your applications.', url: 'https://angular.dev', domain: 'angular.dev' },
    { title: 'Angular Documentation Overview - angular.dev', snippet: 'Angular is a development platform, built on TypeScript. As a platform, Angular includes a component-based framework for building scalable web applications and a collection of well-integrated libraries.', url: 'https://angular.dev/overview', domain: 'angular.dev' },
  ],
  javascript: [
    { title: 'JavaScript | MDN Web Docs', snippet: 'JavaScript (JS) is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions. It is most well-known as the scripting language for Web pages, but is also used in non-browser environments.', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript', domain: 'developer.mozilla.org' },
    { title: 'The Modern JavaScript Tutorial - javascript.info', snippet: 'Modern JavaScript Tutorial: simple, but detailed explanations with examples and tasks. Includes closures, prototypes, promises, async/await, modules, and much more.', url: 'https://javascript.info', domain: 'javascript.info' },
    { title: 'JavaScript - Wikipedia', snippet: 'JavaScript, often abbreviated as JS, is a programming language and core technology of the World Wide Web, alongside HTML and CSS. As of 2023, 98.7% of websites use JavaScript on the client side.', url: 'https://en.wikipedia.org/wiki/JavaScript', domain: 'en.wikipedia.org' },
  ],
  python: [
    { title: 'Welcome to Python.org', snippet: 'Python is a programming language that lets you work quickly and integrate systems more effectively. It has efficient high-level data structures and a simple but effective approach to object-oriented programming.', url: 'https://www.python.org', domain: 'python.org' },
    { title: 'Python 3 Documentation - docs.python.org', snippet: 'Welcome to the official Python 3 documentation. Python is an easy to learn, powerful programming language with dynamic typing and garbage collection. Its clean syntax makes it ideal for beginners.', url: 'https://docs.python.org/3/', domain: 'docs.python.org' },
    { title: 'Python Tutorial - W3Schools', snippet: 'Python is a popular general-purpose programming language used in web development, data science, AI/ML, automation, and more. Easy to learn with clean syntax and massive community support.', url: 'https://www.w3schools.com/python/', domain: 'w3schools.com' },
  ],
  machine_learning: [
    { title: 'Machine Learning - Google Developers', snippet: 'Machine learning (ML) is a type of artificial intelligence that allows software applications to become more accurate at predicting outcomes without being explicitly programmed. ML algorithms use historical data as input.', url: 'https://developers.google.com/machine-learning/crash-course/ml-intro', domain: 'developers.google.com' },
    { title: 'Machine Learning - Wikipedia', snippet: 'Machine learning (ML) is a field of study in artificial intelligence concerned with development of statistical algorithms that can learn from data and generalize to unseen data, and thus perform tasks without explicit instructions.', url: 'https://en.wikipedia.org/wiki/Machine_learning', domain: 'en.wikipedia.org' },
    { title: 'Machine Learning Specialization - Coursera', snippet: 'Build your understanding of ML algorithms from the ground up. Learn supervised learning, unsupervised learning, recommender systems, and reinforcement learning with Andrew Ng.', url: 'https://www.coursera.org/specializations/machine-learning-introduction', domain: 'coursera.org' },
  ],
  neural_network: [
    { title: 'Neural Networks - Wikipedia', snippet: 'Artificial neural networks (ANNs) are models inspired by biological neural networks in animal brains. An ANN consists of layers of connected nodes or neurons that process information using connectionist approaches.', url: 'https://en.wikipedia.org/wiki/Neural_network_(machine_learning)', domain: 'en.wikipedia.org' },
    { title: 'But what is a neural network? - 3Blue1Brown (YouTube)', snippet: 'A visual introduction to neural networks. Covers the concept of layers, weights, biases, and activation functions. One of the most-watched introductions to deep learning on the internet.', url: 'https://www.youtube.com/watch?v=aircAruvnKk', domain: 'youtube.com' },
    { title: 'Neural Networks and Deep Learning - Coursera', snippet: 'Learn the foundations of deep learning. Understand how neural networks are structured, how backpropagation works, and how to implement deep learning algorithms using Python and TensorFlow.', url: 'https://www.coursera.org/learn/neural-networks-deep-learning', domain: 'coursera.org' },
  ],
  www: [
    { title: 'World Wide Web - Wikipedia', snippet: 'WWW stands for World Wide Web. It is an information system that enables content sharing over the Internet through user-friendly ways. The Web was invented by Tim Berners-Lee at CERN in 1989.', url: 'https://en.wikipedia.org/wiki/World_Wide_Web', domain: 'en.wikipedia.org' },
    { title: 'History of the World Wide Web - W3C', snippet: 'Tim Berners-Lee invented the World Wide Web (WWW) in 1989 while working at CERN. He wrote the first web browser in 1990. WWW stands for World Wide Web — a system of interlinked hypertext documents on the Internet.', url: 'https://www.w3.org/History.html', domain: 'w3.org' },
    { title: 'What is WWW? - MDN Web Docs', snippet: 'The World Wide Web—commonly referred to as WWW, W3, or the Web—is an interconnected system of public webpages accessible through the Internet. The Web is not the same as the Internet — it is one of many applications built on top of it.', url: 'https://developer.mozilla.org/en-US/docs/Glossary/World_Wide_Web', domain: 'developer.mozilla.org' },
  ],
  css: [
    { title: 'CSS: Cascading Style Sheets | MDN Web Docs', snippet: 'Cascading Style Sheets (CSS) is a stylesheet language used to describe the presentation of a document written in HTML. CSS describes how elements should be rendered on screen, on paper, or in speech.', url: 'https://developer.mozilla.org/en-US/docs/Web/CSS', domain: 'developer.mozilla.org' },
    { title: 'CSS Tutorial - W3Schools', snippet: 'CSS is the language we use to style an HTML document. CSS describes how HTML elements should be displayed. This tutorial will teach you CSS from basic to advanced level.', url: 'https://www.w3schools.com/css/', domain: 'w3schools.com' },
  ],
  html: [
    { title: 'HTML: HyperText Markup Language | MDN Web Docs', snippet: 'HTML (HyperText Markup Language) is the most basic building block of the Web. It defines the meaning and structure of web content. HTML uses "markup" to annotate text, images, and other content for display in a Web browser.', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML', domain: 'developer.mozilla.org' },
    { title: 'HTML Tutorial - W3Schools', snippet: 'HTML is the standard markup language for creating Web pages. HTML stands for Hyper Text Markup Language. HTML describes the structure of a Web page and consists of a series of elements.', url: 'https://www.w3schools.com/html/', domain: 'w3schools.com' },
  ],
  git: [
    { title: 'Git - Official Documentation', snippet: 'Git is a free and open source distributed version control system designed to handle everything from small to very large projects with speed and efficiency. Git is easy to learn and has a tiny footprint.', url: 'https://git-scm.com/doc', domain: 'git-scm.com' },
    { title: 'Git Tutorials & Training - Atlassian', snippet: 'Learn Git with Atlassian. Understand branching, merging, rebasing, pull requests, and more with step-by-step beginner and advanced tutorials.', url: 'https://www.atlassian.com/git/tutorials', domain: 'atlassian.com' },
  ],
  docker: [
    { title: 'Docker: Container Application Development', snippet: 'Docker is an open platform for developing, shipping, and running applications in containers. It enables you to separate your applications from your infrastructure so you can deliver software quickly.', url: 'https://www.docker.com', domain: 'docker.com' },
    { title: 'Docker Documentation - docs.docker.com', snippet: 'Docker documentation covers getting started guides, Docker Desktop, Docker Compose, container orchestration, Dockerfile reference, and Docker Hub for image storage and sharing.', url: 'https://docs.docker.com', domain: 'docs.docker.com' },
  ],
  sql: [
    { title: 'SQL Tutorial - W3Schools', snippet: 'SQL is a standard language for storing, manipulating and retrieving data in databases. Our SQL tutorial will teach you how to use SQL in MySQL, SQL Server, MS Access, Oracle, Sybase, PostgreSQL, and more.', url: 'https://www.w3schools.com/sql/', domain: 'w3schools.com' },
    { title: 'SQL - Wikipedia', snippet: 'SQL (Structured Query Language) is a domain-specific language used to manage data in a relational database management system (RDBMS). It is particularly useful in handling structured tabular data.', url: 'https://en.wikipedia.org/wiki/SQL', domain: 'en.wikipedia.org' },
  ],
  quantum: [
    { title: 'Quantum computing - Wikipedia', snippet: 'Quantum computing is a type of computation whose operations can harness the phenomena of quantum mechanics, such as superposition, interference, and entanglement. It uses quantum bits (qubits) instead of classical bits.', url: 'https://en.wikipedia.org/wiki/Quantum_computing', domain: 'en.wikipedia.org' },
    { title: 'What is Quantum Computing? - IBM', snippet: 'Quantum computing is a rapidly-emerging technology that harnesses the laws of quantum mechanics to solve problems too complex for classical computers. IBM has been at the forefront of quantum research since 2016.', url: 'https://www.ibm.com/topics/quantum-computing', domain: 'ibm.com' },
  ],
  blockchain: [
    { title: 'Blockchain - Wikipedia', snippet: 'A blockchain is a distributed ledger with growing lists of records (blocks) that are securely linked together via cryptographic hashes. Each block contains a cryptographic hash of the previous block, a timestamp, and transaction data.', url: 'https://en.wikipedia.org/wiki/Blockchain', domain: 'en.wikipedia.org' },
    { title: 'What is Blockchain Technology? - IBM', snippet: 'Blockchain is a shared, immutable ledger that facilitates the process of recording transactions and tracking assets in a business network. Nearly anything of value can be tracked and traded on a blockchain network.', url: 'https://www.ibm.com/topics/blockchain', domain: 'ibm.com' },
  ],
};

const KEYWORD_MAP = {
  react: 'react', 'react.js': 'react', reactjs: 'react',
  vue: 'vue', 'vue.js': 'vue', vuejs: 'vue',
  angular: 'angular',
  javascript: 'javascript', ' js ': 'javascript',
  python: 'python',
  'machine learning': 'machine_learning', ' ml ': 'machine_learning', 'artificial intelligence': 'machine_learning', ' ai ': 'machine_learning',
  'neural network': 'neural_network', 'deep learning': 'neural_network', backpropagation: 'neural_network',
  'www': 'www', 'world wide web': 'www',
  ' css ': 'css', 'cascading style': 'css',
  ' html ': 'html', 'hypertext markup': 'html',
  ' git ': 'git', github: 'git',
  docker: 'docker', container: 'docker',
  ' sql ': 'sql', database: 'sql', mysql: 'sql', postgresql: 'sql',
  quantum: 'quantum',
  blockchain: 'blockchain', cryptocurrency: 'blockchain',
};

function buildSmartMockResults(query) {
  const q = ' ' + query.toLowerCase() + ' ';
  const matched = [];

  for (const [keyword, topicKey] of Object.entries(KEYWORD_MAP)) {
    if (q.includes(keyword) && TOPIC_DB[topicKey]) {
      for (const r of TOPIC_DB[topicKey]) {
        if (!matched.find(m => m.url === r.url)) matched.push(r);
      }
    }
  }

  if (matched.length >= 3) {
    return matched.slice(0, 7).map((r, i) => ({
      ...r, id: `mock-${i}`, source: 'demo', type: 'TEXT', timestamp: Date.now()
    }));
  }

  // Generic fallback with real search URLs
  const enc = encodeURIComponent(query);
  const shortQ = query.length > 45 ? query.slice(0, 45) + '...' : query;
  return [
    { id: 'mock-0', title: `${shortQ} - Wikipedia`, snippet: `Wikipedia provides a comprehensive overview of ${shortQ}, covering its definition, history, key concepts, and related topics. This article is maintained by thousands of contributors worldwide.`, url: `https://en.wikipedia.org/w/index.php?search=${enc}`, domain: 'en.wikipedia.org', source: 'demo', type: 'TEXT', timestamp: Date.now() },
    { id: 'mock-1', title: `${shortQ} | MDN Web Docs`, snippet: `MDN Web Docs is the go-to resource for web developers. Find detailed documentation, browser compatibility information, and working code examples related to ${shortQ}.`, url: `https://developer.mozilla.org/en-US/search?q=${enc}`, domain: 'developer.mozilla.org', source: 'demo', type: 'TEXT', timestamp: Date.now() },
    { id: 'mock-2', title: `${shortQ} - Stack Overflow`, snippet: `Thousands of developers have asked and answered questions about ${shortQ} on Stack Overflow. Find solutions, code snippets, and expert advice from the developer community.`, url: `https://stackoverflow.com/search?q=${enc}`, domain: 'stackoverflow.com', source: 'demo', type: 'TEXT', timestamp: Date.now() },
    { id: 'mock-3', title: `${shortQ} - freeCodeCamp`, snippet: `freeCodeCamp offers free tutorials, courses, and articles on ${shortQ}. Learn at your own pace with hands-on projects and a supportive community of millions of learners.`, url: `https://www.freecodecamp.org/news/search/?query=${enc}`, domain: 'freecodecamp.org', source: 'demo', type: 'TEXT', timestamp: Date.now() },
    { id: 'mock-4', title: `${shortQ} - GeeksforGeeks`, snippet: `GeeksforGeeks provides well-explained tutorials, examples, and practice problems on ${shortQ}. Covering concepts from beginner to advanced level with diagrams and code.`, url: `https://www.geeksforgeeks.org/search/?q=${enc}`, domain: 'geeksforgeeks.org', source: 'demo', type: 'TEXT', timestamp: Date.now() },
  ];
}

async function webSearch(query) {
  for (const [name, fn] of [['serpapi', serpApiSearch], ['google', googleCustomSearch], ['bing', bingSearch]]) {
    try {
      const results = await fn(query);
      if (results.length > 0) return { results, provider: name, live: true };
    } catch (e) {
      console.log(`[Search] ${name}: ${e.message}`);
    }
  }
  return { results: buildSmartMockResults(query), provider: 'demo', live: false };
}

module.exports = { webSearch };
