/* eslint-disable max-len */
const books = [
  {
    id: 1,
    title: "Mindf*ck Inside Cambriadge Analytica Story",
    author: "Christhopher Wylie",
    category: "Non-FIction,Technology",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "Mindf*ck is a gripping firsthand account of the Cambridge Analytica scandal. Christopher Wylie reveals how data mining and psychological profiling were used to manipulate elections globally. It is a cautionary tale about the power of technology and the erosion of privacy.",
    year: 2023,
    tags: [
      "Technology",
      "Psychology",
      "Non-Fiction"
    ]
  },
  {
    id: 2,
    title: "शिवाजी कोण होता ?",
    author: "कॉ . गोविंद पानसरे ",
    category: "Literature",
    language: "Marathi",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "कॉ. गोविंद पानसरे लिखित 'शिवाजी कोण होता?' हे पुस्तक छत्रपती शिवाजी महाराजांच्या कार्याचा वस्तुनिष्ठ आढावा घेते. महाराजांच्या प्रतिमेभोवती असलेले धार्मिक आणि जातीय गैरसमज दूर करून, त्यांचे जनकल्याणकारी आणि पुरोगामी रूप यात मांडले आहे. हे पुस्तक शिवरायांच्या खऱ्या इतिहासाची ओळख करून देते.",
    year: 2022,
    tags: [
      "Literature"
    ]
  },
  {
    id: 3,
    title: "The SIlent Coup: The History of India's Deep State",
    author: "Josy Joseph",
    category: "Political",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "The Silent Coup explores the 'deep state' in India and how institutions have been systematically undermined. Josy Joseph provides an investigative look into the nexus between politics, intelligence, and crime. It highlights the challenges facing Indian democracy.",
    year: 2024,
    tags: [
      "Politics",
      "Political"
    ]
  },
  {
    id: 4,
    title: "मी अल्बर्ट एलिस ",
    author: "Albert Ellis ",
    category: "Psychology, Self-Help",
    language: "Marathi",
    translator: "Dr. Anjali Joshi",
    blog_link: "https://daredavil01.blogspot.com/2019/07/book-review-part1.html",
    blog_platform: "Blogger",
    description: "'मी अल्बर्ट एलिस' हे डॉ. अंजली जोशी यांनी लिहिलेले प्रसिद्ध मानसशास्त्रज्ञ अल्बर्ट एलिस यांचे चरित्र आहे. यात त्यांच्या 'REBT' (Rational Emotive Behavior Therapy) या उपचार पद्धतीचा आणि त्यांच्या प्रेरणादायी जीवनप्रवासाचा वेध घेतला आहे. विवेकी जीवन जगण्यासाठी हे पुस्तक अत्यंत उपयुक्त आहे.",
    year: 2019,
    tags: [
      "Self-Help",
      "Psychology"
    ]
  },
  {
    id: 5,
    title: "असाही विचार करायला काय हरकत आहे ... ",
    author: "Dr. Nitin Shinde",
    category: "Social ",
    language: "Marathi",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "डॉ. नितीन शिंदे यांचे 'असाही विचार करायला काय हरकत आहे...' हे पुस्तक समाज आणि विचारांच्या चौकटी बदलण्यावर भर देते. यात दैनंदिन आयुष्यातील समस्यांकडे पाहण्याचा एक नवा आणि सकारात्मक दृष्टिकोन दिला आहे. वाचकांना अंतर्मुख करणारी ही वैचारिक मांडणी आहे.",
    year: 2019,
    tags: [
      "Social"
    ]
  },
  {
    id: 6,
    title: "Flow: The Clasic Work on how to achieve Happiness",
    author: "Mihaly Csikszentmihalyi",
    category: "Self-Help",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "Flow: The Classic Work on how to achieve Happiness explains the concept of 'optimal experience.' Mihaly Csikszentmihalyi argues that true happiness comes from being fully immersed in a challenging task. It provides a scientific framework for achieving peak performance and satisfaction.",
    year: 2022,
    tags: [
      "Technology",
      "Self-Help",
      "AI"
    ]
  },
  {
    id: 7,
    title: "The Subtle Art of NOT Giving A F*ck",
    author: "Mark Manson",
    category: "Self-Help",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "The Subtle Art of Not Giving a F*ck is a refreshing guide to self-improvement. Mark Manson argues that we should focus on what truly matters and accept life's inevitable struggles. It challenges conventional positive thinking with practical, blunt advice.",
    year: 2022,
    tags: [
      "Self-Help"
    ]
  },
  {
    id: 8,
    title: "7 Habits of Highly Effective People",
    author: "Stephen R. Covey",
    category: "Self-Help",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "The 7 Habits of Highly Effective People is a seminal work on personal and professional growth. Stephen Covey presents a principle-centered approach to solving personal and professional problems. It focuses on character ethics and long-term effectiveness.",
    year: 2021,
    tags: [
      "Self-Help"
    ]
  },
  {
    id: 9,
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    category: "Non-fiction, Social",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "Sapiens: A Brief History of Humankind traces the history of our species from the Stone Age to the modern era. Yuval Noah Harari explores how biology and history have shaped our societies and beliefs. It is a thought-provoking look at the impact of Homo sapiens on the planet.",
    year: 2021,
    tags: [
      "Fiction",
      "Social",
      "History",
      "Non-Fiction"
    ]
  },
  {
    id: 10,
    title: "Homo Deus: A Brief History of Tomorrow",
    author: "Yuval Noah Harari",
    category: "Non-fiction, Social",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "Homo Deus: A Brief History of Tomorrow examines the future of humanity in an age of biotechnology and AI. Harari explores how humans might attempt to overcome death and achieve god-like powers. It raises profound ethical and existential questions about our trajectory.",
    year: 2022,
    tags: [
      "AI",
      "History",
      "Non-Fiction",
      "Technology",
      "Social",
      "Fiction"
    ]
  },
  {
    id: 11,
    title: "21 Lessons for the 21st Century",
    author: "Yuval Noah Harari",
    category: "Non-fiction, Social",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "21 Lessons for the 21st Century addresses the most pressing issues of our time, from technology to politics. Yuval Noah Harari provides a framework for understanding the complexities of the modern world. It encourages readers to think critically about the challenges we face today.",
    year: 2023,
    tags: [
      "Technology",
      "Social",
      "Non-Fiction"
    ]
  },
  {
    id: 12,
    title: "Pegasus: The Story of the World's Most Dangerous Spyware",
    author: "Laurent Richard & \nSandrine Rigaud",
    category: "Technology, Privacy",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "Pegasus reveals the chilling story of the NSO Group's spyware used to target journalists and activists. Laurent Richard and Sandrine Rigaud document the global investigation into state-sponsored surveillance. It is a vital report on the threats to privacy and digital freedom.",
    year: 2023,
    tags: [
      "Technology",
      "Fiction",
      "Privacy",
      "Politics"
    ]
  },
  {
    id: 13,
    title: "The Nitopadesha",
    author: "Nitin Pai",
    category: "Public-policy",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "The Nitopadesha is a collection of modern fables by Nitin Pai that explores the duties of a citizen. Drawing inspiration from ancient Indian texts, it uses stories to teach 'citizen-craft' and ethical governance. It is an essential guide for anyone interested in public life.",
    year: 2024,
    tags: [
      "Public-Policy"
    ]
  },
  {
    id: 14,
    title: "Missing In Action: Why You Should Care About Public Policy",
    author: "Pranay Kotasthane &\nRaghu S. Jaitley",
    category: "Public-policy",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "Missing In Action examines why public policy often fails to deliver results in India. Pranay Kotasthane and Raghu S. Jaitley explain the complexities of governance and the role of individual citizens. It provides a toolkit for understanding and improving policy outcomes.",
    year: 2024,
    tags: [
      "Technology",
      "Public-Policy",
      "AI",
      "Politics"
    ]
  },
  {
    id: 15,
    title: "न्या . लोयांचा खुनी कोण ?",
    author: "निरंजन टकले ",
    category: "Social",
    language: "Marathi",
    translator: "मुग्धा धनंजय ",
    blog_link: null,
    blog_platform: null,
    description: "निरंजन टकले यांचे 'न्या. लोयांचा खुनी कोण?' हे पुस्तक न्यायमूर्ती लोया यांच्या गूढ मृत्यूबद्दलचे शोधपत्रकारिता करणारे पुस्तक आहे. यात या प्रकरणातील विविध पैलू आणि संशयास्पद बाबींवर प्रकाश टाकण्यात आला आहे. हे पुस्तक भारतीय न्यायव्यवस्था आणि सत्तेच्या संघर्षावर भाष्य करते.",
    year: 2024,
    tags: [
      "Social"
    ]
  },
  {
    id: 16,
    title: "राधिकासांत्वनाम:  ",
    author: "मृदूपलानी",
    category: "Fiction, Sexual-Drama",
    language: "Marathi",
    translator: "Dr. Shantunu Abhyankar",
    blog_link: null,
    blog_platform: null,
    description: "मृदूपलानी यांची 'राधिकासांत्वनाम' ही १८ व्या शतकातील एक प्रसिद्ध शृंगारिक कलाकृती आहे. यात राधा आणि कृष्णाच्या प्रेमाचे, विरहाचे आणि मीलनाचे अत्यंत तरल आणि प्रभावी वर्णन केले आहे. हे पुस्तक भारतीय साहित्यातील शृंगारिक परंपरेचा एक महत्त्वाचा भाग आहे.",
    year: 2024,
    tags: [
      "Fiction",
      "Sexual-Drama"
    ]
  },
  {
    id: 17,
    title: "Animal Farm",
    author: "George Orwell",
    category: "Philosophy, Fiction",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "Animal Farm is a classic allegorical novella that critiques totalitarianism and the corruption of power. George Orwell uses a group of farm animals to represent the events leading up to the Russian Revolution. It remains a powerful warning about how ideals can be betrayed.",
    year: 2021,
    tags: [
      "Technology",
      "Fiction",
      "AI",
      "Philosophy"
    ]
  },
  {
    id: 18,
    title: "Man's Search For Meaning",
    author: "Victor Frankl",
    category: "Philosophy, Spirituality",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "Man's Search for Meaning is Viktor Frankl's profound account of surviving Nazi concentration camps. He argues that finding meaning in life is the primary human drive, even in the most horrific circumstances. It introduces logotherapy as a path to psychological resilience.",
    year: 2022,
    tags: [
      "Spirituality",
      "Philosophy"
    ]
  },
  {
    id: 19,
    title: "The Art of Loving",
    author: "Erich Fromm",
    category: "Love, Philosophy",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "The Art of Loving by Erich Fromm explores the nature of love as an active power rather than a passive emotion. Fromm argues that love is a skill that can be developed through practice and discipline. It remains a foundational text in humanistic psychology.",
    year: 2025,
    tags: [
      "AI",
      "Technology",
      "Psychology",
      "Philosophy",
      "Love"
    ]
  },
  {
    id: 20,
    title: "1984",
    author: "George Orwell",
    category: "Fiction, Philosophy",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "1984 is George Orwell's dystopian masterpiece about a surveillance state ruled by Big Brother. It explores themes of censorship, propaganda, and the loss of individual freedom. The novel's concepts like 'Newspeak' and 'Thoughtcrime' continue to resonate today.",
    year: 2024,
    tags: [
      "Politics",
      "Fiction",
      "Philosophy"
    ]
  },
  {
    id: 21,
    title: "Brave New World",
    author: "Aldous Huxley",
    category: "Fiction",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "Brave New World by Aldous Huxley presents a future society where people are genetically engineered and kept compliant through pleasure. It is a sharp critique of consumerism and the loss of human individuality in a technologically advanced world. It serves as a stark warning about a 'perfect' society.",
    year: 2025,
    tags: [
      "Technology",
      "Fiction",
      "Social"
    ]
  },
  {
    id: 22,
    title: "हिंदू ",
    author: "भालचंद्र नेमाडे ",
    category: "Religion",
    language: "Marathi",
    translator: null,
    blog_link: "https://www.canva.com/design/DAGq0rZf2fk/Hu3_IoARZzL-MggGgszADA/view#1",
    blog_platform: "Canva",
    description: "भालचंद्र नेमाडे यांची 'हिंदू - जगण्याची समृद्ध अडगळ' ही कादंबरी मराठी साहित्यातील एक मैलाचा दगड आहे. यात हिंदू संस्कृतीचा इतिहास आणि वर्तमान खंडेराव या पात्राच्या माध्यमातून मांडला आहे. संस्कृतीचे पदर उलगडणारी ही कादंबरी अत्यंत सखोल आणि चिंतनशील आहे.",
    year: 2025,
    tags: [
      "Religion"
    ]
  },
  {
    id: 23,
    title: "We, The Citizens : Strengthening the Indian Republic",
    author: "Khyati Pathak (Author),\n Anupam Manur (Author), \nPranay Kotasthane (Author)",
    category: "Public-policy",
    language: "English",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "We, The Citizens provides a framework for understanding and strengthening the Indian Republic. The authors discuss the role of the state, the importance of individual rights, and the challenges of governance. It is a call to action for every citizen to engage in building a better nation.",
    year: 2025,
    tags: [
      "Politics",
      "Public-Policy"
    ]
  },
  {
    id: 24,
    title: "गडकिल्ले आणि मी ",
    author: "डॉ. संग्राम इंदोरे  ",
    category: "History, Forts, Maharashtra",
    language: "Marathi",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "डॉ. संग्राम इंदोरे यांचे 'गडकिल्ले आणि मी' हे पुस्तक महाराष्ट्रातील किल्ल्यांच्या सफरीचा एक प्रवासवृत्तांत आहे. यात किल्ल्यांचा इतिहास, भूगोल आणि लेखकाचे वैयक्तिक अनुभव अत्यंत रंजकपणे मांडले आहेत. गिर्यारोहक आणि इतिहासप्रेमींसाठी हे पुस्तक एक पर्वणीच आहे.",
    year: 2025,
    tags: [
      "Maharashtra",
      "Forts",
      "History"
    ]
  },
  {
    id: 25,
    title: "एक होता कार्व्हर ",
    author: "वीणा गवाणकर ",
    category: "Non-fiction",
    language: "Marathi",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "वीणा गवाणकर यांचे 'एक होता कार्व्हर' हे जॉर्ज वॉशिंग्टन कार्व्हर यांचे प्रेरणादायी चरित्र आहे. एका गुलाम कुटुंबात जन्मलेल्या मुलाने आपल्या बुद्धिमत्तेच्या जोरावर शास्त्रज्ञ म्हणून कशी प्रगती केली, याचा हा प्रवास आहे. हे पुस्तक जिद्द आणि चिकाटीची शिकवण देते.",
    year: 2025,
    tags: [
      "Non-Fiction"
    ]
  },
  {
    id: 26,
    title: "प्रकाशवाटा ",
    author: "डॉ. प्रकाश आमटे ",
    category: "Social",
    language: "Marathi",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "डॉ. प्रकाश आमटे यांचे 'प्रकाशवाटा' हे आत्मचरित्र हेमलकसा येथील त्यांच्या अचाट कार्याची गाथा आहे. आदिवासींच्या आरोग्यासाठी आणि शिक्षणासाठी त्यांनी दिलेले योगदान यात शब्दांकित केले आहे. हे पुस्तक समाजसेवेचा आदर्श घालून देते आणि मानवतेचा संदेश देते.",
    year: 2025,
    tags: [
      "Social"
    ]
  },
  {
    id: 27,
    title: "माझा साक्षात्कारी हृदयरोग ",
    author: "अभय बंग ",
    category: "Philosophy",
    language: "Marathi",
    translator: null,
    blog_link: "https://www.canva.com/design/DAGq0rZf2fk/Hu3_IoARZzL-MggGgszADA/view#3",
    blog_platform: "Canva",
    description: "डॉ. अभय बंग यांचे 'माझा साक्षात्कारी हृदयरोग' हे पुस्तक त्यांच्या हृदयविकाराच्या अनुभवावर आधारित आहे. हृदयविकारामुळे त्यांच्या आयुष्यात आलेला बदल आणि त्यातून मिळालेली जीवनविषयक दृष्टी यात मांडली आहे. हे पुस्तक केवळ आजाराबद्दल नसून जगण्याच्या तत्त्वज्ञानाबद्दल आहे.",
    year: 2025,
    tags: [
      "Philosophy"
    ]
  },
  {
    id: 28,
    title: "When The Chips Are Down",
    author: "Pranay Kotasthane &\nAbhiram Manchi",
    category: "Semi-counductor",
    language: "English",
    translator: null,
    blog_link: "https://www.linkedin.com/posts/sankettambare_bookreview-bookreview-chips-activity-7269371162944552960-YaIX?utm_source=share&utm_medium=member_desktop&rcm=ACoAACWW-BABDw2ccOeO0r7HfLUq8J3FjF3o40k",
    blog_platform: "LinkedIn",
    description: "When The Chips Are Down explores the critical role of semiconductors in modern geopolitics. Pranay Kotasthane and Abhiram Manchi explain the supply chain and why 'chips' have become the new oil. It is a must-read for understanding the technological cold war between nations.",
    year: 2025,
    tags: [
      "Semi-Counductor",
      "Technology"
    ]
  },
  {
    id: 29,
    title: "AI Snake Oil",
    author: "Arvind Narayanan & \nSayash Kapoor",
    category: "Technology, AI",
    language: "English",
    translator: null,
    blog_link: "https://sankettambare.substack.com/p/book-review-ai-snake-oil",
    blog_platform: "Substack",
    description: "AI Snake Oil critically examines the hype surrounding artificial intelligence and its real-world limitations. Arvind Narayanan and Sayash Kapoor debunk common myths about AI's predictive powers. It encourages a more grounded and ethical approach to AI development.",
    year: 2025,
    tags: [
      "Politics",
      "AI",
      "Technology",
      "Social"
    ]
  },
  {
    id: 30,
    title: "Careless People: A Story of where I used to work:\nPower. Greed. Madness.",
    author: "Sarah Wynn-Williams",
    category: "Non-fiction, Technology",
    language: "English",
    translator: null,
    blog_link: "https://sankettambare.substack.com/p/book-review-careless-people-sarah",
    blog_platform: "Substack",
    description: "Careless People provides a deep look at the internal culture of Facebook and the consequences of its rapid growth. Sarah Wynn-Williams shares her experiences working at the tech giant and the ethical dilemmas she faced. It reveals the trade-offs between profit and responsibility.",
    year: 2025,
    tags: [
      "Technology",
      "Non-Fiction"
    ]
  },
  {
    id: 31,
    title: "The age of AI",
    author: "Henry Kissinger &\nEric Schmidt &\nDaniel Huttenlocher",
    category: "Technology",
    language: "English",
    translator: null,
    blog_link: "https://sankettambare.substack.com/p/book-review-the-age-of-ai",
    blog_platform: "Substack",
    description: "The Age of AI discusses how artificial intelligence is reshaping human history and our future. Henry Kissinger, Eric Schmidt, and Daniel Huttenlocher explore the strategic and social implications of AI. It is a profound meditation on the evolution of human intelligence.",
    year: 2025,
    tags: [
      "Technology",
      "AI"
    ]
  },
  {
    id: 32,
    title: "नदीष्ट ",
    author: "मनोज बोरगावकर ",
    category: "Story, FIction",
    language: "Marathi",
    translator: null,
    blog_link: "https://www.canva.com/design/DAGq0rZf2fk/Hu3_IoARZzL-MggGgszADA/view#2",
    blog_platform: "Canva",
    description: "मनोज बोरगावकर यांची 'नदीष्ट' ही कादंबरी नदीकाठच्या संस्कृतीचे आणि तिथल्या माणसांच्या संघर्षाचे चित्रण करते. नदीच्या प्रवाहाप्रमाणे वाहणारे आयुष्य आणि त्यातील वळणे यात प्रभावीपणे मांडली आहेत. ही कादंबरी मानवी स्वभाव आणि निसर्गाचा अनुबंध दर्शवते.",
    year: 2025,
    tags: [
      "Story",
      "Fiction"
    ]
  },
  {
    id: 33,
    title: "वॉल्टन",
    author: " हेन्री डेविड थोरो ",
    category: "Fiction",
    language: "Marathi",
    translator: "जयंत कुलकर्णी ",
    blog_link: "https://www.canva.com/design/DAGq0rZf2fk/Hu3_IoARZzL-MggGgszADA/view#5",
    blog_platform: "Canva",
    description: "हेन्री डेविड थोरो यांच्या 'वॉल्डन' या मूळ पुस्तकाचा 'वॉल्टन' हा मराठी अनुवाद आहे. निसर्गाच्या सानिध्यात साधे जीवन जगण्याचा अनुभव यात लेखकाने मांडला आहे. स्वावलंबन आणि आध्यात्मिक शांततेचा शोध घेणारे हे एक अभिजात पुस्तक आहे.",
    year: 2025,
    tags: [
      "Fiction"
    ]
  },
  {
    id: 34,
    title: "AI 2041: Ten Visions for our future",
    author: "Chen Qiufan",
    category: "AI, Technology",
    language: "English",
    translator: null,
    blog_link: "https://sankettambare.substack.com/p/book-review-ai-2041",
    blog_platform: "Substack",
    description: "AI 2041 combines speculative fiction with technical analysis to predict how AI will change our lives by 2041. Chen Qiufan writes ten stories set in the future, while Kai-Fu Lee explains the underlying technologies. It provides a balanced view of AI's potential and perils.",
    year: 2025,
    tags: [
      "Fiction",
      "AI",
      "Technology"
    ]
  },
  {
    id: 35,
    title: "Make Time: How to Focus on What Matters Every Day",
    author: "Jake Knapp and John Zeretsky",
    category: "Technology, Self-Help",
    language: "English",
    translator: null,
    blog_link: 'https://sankettambare.substack.com/p/book-review-make-time',
    blog_platform: 'Substack',
    description: "Make Time offers practical strategies to help you focus on what truly matters every day. Jake Knapp and John Zeretsky provide a four-step framework: Highlight, Laser, Energize, and Reflect. It is a guide to taking control of your time in a distracted world.",
    year: 2025,
    tags: [
      "Technology",
      "Self-Help",
    ]
  },
  {
    id: 36,
    title: "मेळघाटातील मोहर: डॉ. रवींद्र आणि डॉ. स्मिता कोल्हे ",
    author: "मृणालिनी चितळे ",
    category: "Social",
    language: "Marathi",
    translator: null,
    blog_link: null,
    blog_platform: null,
    description: "मृणालिनी चितळे यांचे 'मेळघाटातील मोहर' हे पुस्तक डॉ. रवींद्र आणि डॉ. स्मिता कोल्हे यांच्या कार्यावर आधारित आहे. मेळघाटातील कुपोषण आणि आरोग्य प्रश्नांवर त्यांनी दिलेला लढा यात मांडला आहे. हे पुस्तक एका निस्वार्थ डॉक्टर दांपत्याच्या संघर्षाची कहाणी आहे.",
    year: 2025,
    tags: [
      "Social"
    ]
  },
  {
    id: 37,
    title: "Permanent Record",
    author: "Edward Snowden",
    category: "Technology, Surveillance",
    language: "English",
    translator: null,
    blog_link: "https://daredavil453624413.wordpress.com/2020/08/18/book-review-permanent-record/",
    blog_platform: "WordPress",
    description: "Permanent Record is Edward Snowden's memoir about his time at the CIA and NSA. He details how he discovered the extent of mass surveillance and why he decided to blow the whistle. It is a gripping account of digital privacy and state power.",
    year: 2022,
    tags: [
      "Biography",
      "Surveillance",
      "Technology"
    ]
  },
  {
    id: 38,
    title: "Ways of Seeing",
    author: "John Berger",
    category: "Art, Philosophy",
    language: "English",
    translator: null,
    blog_link: "https://daredavil453624413.wordpress.com/2021/02/28/ways-of-seeing-john-berger/",
    blog_platform: "WordPress",
    description: "Ways of Seeing by John Berger is a seminal work on art criticism and visual perception. Berger explores how our culture and background influence the way we look at art. It challenges traditional ways of interpreting images and their meanings.",
    year: 2021,
    tags: [
      "Art",
      "Philosophy",
      "Social"
    ]
  },
  {
    id: 39,
    title: "The Anxious Generation",
    author: "Jonathan Haidt",
    category: "Technology, Psychology",
    language: "English",
    translator: null,
    blog_link: "https://sankettambare.substack.com/p/book-review-the-anxious-generation",
    blog_platform: "Substack",
    description: "The Anxious Generation explores the rise of mental health issues among young people in the digital age. Jonathan Haidt examines how the transition to a 'phone-based' childhood has impacted development. It offers solutions for parents and educators to mitigate these effects.",
    year: 2025,
    tags: [
      "Technology",
      "Psychology",
      "AI"
    ]
  },
  {
    id: 40,
    title: "Possible Minds",
    author: "John Brockman",
    category: "Technology, AI",
    language: "English",
    translator: null,
    blog_link: "https://sankettambare.substack.com/p/book-review-possible-minds",
    blog_platform: "Substack",
    description: "Possible Minds is a collection of essays edited by John Brockman featuring leading thinkers on AI. Contributors discuss the future of intelligence, ethics, and the potential impact of superintelligence. It provides a diverse range of perspectives on the most important technology of our era.",
    year: 2025,
    tags: [
      "Politics",
      "AI",
      "Technology",
      "Social"
    ]
  },
  {
    id: 41,
    title: "Can't Hurt Me",
    author: "David Goggins",
    category: "Sports, Motivation",
    language: "English",
    translator: null,
    blog_link: "https://www.canva.com/design/DAGq0rZf2fk/Hu3_IoARZzL-MggGgszADA/view#4",
    blog_platform: "Canva",
    description: "Can't Hurt Me is David Goggins' memoir about overcoming extreme hardship through mental toughness. Goggins shares his journey from a traumatic childhood to becoming a Navy SEAL and world-class athlete. It is a testament to the power of the human spirit and discipline.",
    year: 2025,
    tags: [
      "Motivation",
      "Sports",
      "Psychology",
      "Biography"
    ]
  },
  {
    id: 42,
    title: "टाटायन",
    author: "Girish Kuder",
    category: "Fiction",
    language: "Marathi",
    translator: null,
    blog_link: "https://www.canva.com/design/DAGq0rZf2fk/Hu3_IoARZzL-MggGgszADA/view#6",
    blog_platform: "Canva",
    description: "गिरीश कुबेर यांचे 'टाटायन' हे पुस्तक टाटा समूहाने गेल्या १५० वर्षांत केवळ नफा न कमावता नैतिक मूल्यांच्या आधारावर 'राष्ट्र उभारणी' आणि 'उद्योग साम्राज्य' कसे उभे केले, याचा प्रेरणादायी आढावा घेणारी एक पोलादी उद्यमगाथा आहे",
    year: 2026,
    tags: [
      "Auto-Biography",
      "Business",
      "Tata"
    ]
  }
];

export default books;
