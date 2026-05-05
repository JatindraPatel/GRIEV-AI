// ====================================================
// GrievAI – Premium AI Chatbot v4.0
// Full NLP + Hinglish + Voice + Language Selection
// ====================================================

(function () {
  'use strict';

  // ── SESSION ───────────────────────────────────────
  var SESSION = {
    lang:    null,       // null = not chosen yet (shows lang picker first)
    history: [],
    context: null,
    step:    'lang_select'  // states: lang_select → chatting
  };

  // ── PHONETIC / HINGLISH NORMALIZER ────────────────
  var HI_EN = {
    'kaise':'how','karo':'do','kare':'do','karna':'to do','chahiye':'need',
    'nahi':'not','nai':'not','nhi':'not','nahin':'not',
    'ho':'is','hai':'is','hain':'are','tha':'was','the':'were',
    'meri':'my','mera':'my','mujhe':'me','hum':'we','aap':'you',
    'kya':'what','kab':'when','kahan':'where','kyun':'why','kaun':'who',
    'shikayat':'complaint','sikayat':'complaint','shikayat':'complaint',
    'darj':'register','track':'track','status':'status','pata':'know',
    'problem':'problem','problm':'problem','probelem':'problem',
    'complaint':'complaint','complant':'complaint','complint':'complaint',
    'paani':'water','pani':'water','bijli':'electricity','bijlee':'electricity',
    'sadak':'road','sarak':'road','police':'police','polise':'police',
    'doctor':'doctor','docter':'doctor','hospital':'hospital','hospitl':'hospital',
    'school':'school','scool':'school','ration':'ration','rashn':'ration',
    'kachra':'garbage','garbej':'garbage','safai':'cleaning',
    'khet':'farm','kisan':'farmer','majdoor':'labour','mazdoor':'labour',
    'pension':'pension','mahila':'women','baccha':'child',
    'internet':'internet','signal':'signal','network':'network',
    'zameen':'land','jamin':'land','property':'property',
    'vibhag':'department','vibhaag':'department',
    'id':'id','number':'number','number':'number','nambar':'number',
    'milega':'will get','mila':'got','nahi mila':'not received',
    'kab tak':'when will','kitne din':'how many days','din':'days',
    'help':'help','madad':'help','sahayata':'help',
    'dhanyawad':'thanks','shukriya':'thanks','thanks':'thanks',
    'namaste':'hello','namaskar':'hello','helo':'hello',
    'accha':'ok','thik':'ok','sahi':'ok'
  };

  function normalizeHinglish(text) {
    var words = text.toLowerCase().split(/\s+/);
    return words.map(function(w){
      return HI_EN[w] || w;
    }).join(' ');
  }

  // ── INTENT ENGINE ─────────────────────────────────
  var INTENTS = [
    {
      id: 'greeting',
      match: ['hello','hi','hey','namaskar','namaste','helo','good morning',
              'good evening','salam','jai hind','नमस्ते','नमस्कार','hii','hlo'],
      ctx: null
    },
    {
      id: 'file_complaint',
      match: ['file','lodge','register','submit','darj','new complaint',
              'shikayat kaise','complaint karna','kaise kare','complaint dena',
              'shikayat dena','complaint kaise','kaise file','kaise darj',
              'शिकायत दर्ज','शिकायत करना','फाइल'],
      ctx: null,
      action: { en: '📝 Open Complaint Form', hi: '📝 शिकायत फॉर्म खोलें', url: 'index.html#lodge' }
    },
    {
      id: 'track_complaint',
      match: ['track','check','status','kahan','where is','meri shikayat','my complaint',
              'shikayat track','complaint status','track karna','check karna',
              'शिकायत ट्रैक','स्टेटस','ट्रैक'],
      ctx: null,
      action: { en: '🔍 Track Now', hi: '🔍 अभी ट्रैक करें', url: 'track.html' }
    },
    {
      id: 'complaint_id',
      match: ['complaint id','id kya','id number','reference number','registration number',
              'id kahan','id milega','id kaise milega','grievance id','grieva',
              'id nambar','id nahi mila'],
      ctx: null
    },
    {
      id: 'departments',
      match: ['department','departments','vibhag','ministry','office','which dept',
              'kaunsa vibhag','kaun sa vibhag','विभाग','department list'],
      ctx: null,
      action: { en: '🏛️ View Departments', hi: '🏛️ विभाग देखें', url: 'departments.html' }
    },
    {
      id: 'timeline',
      match: ['how long','kitne din','time','days','duration','when will','kab tak',
              'kab milega','kitna time','resolution time','कितने दिन','समय'],
      ctx: null
    },
    {
      id: 'escalate',
      match: ['escalate','no action','no response','not resolved','ignored',
              'senior','appeal','complaint not resolved','koi action nahi',
              'koi jawab nahi','sunte nahi','escalation'],
      ctx: null
    },
    {
      id: 'help',
      match: ['help','guide','how to use','kaise use','steps','instruction',
              'assist','madad','sahayata','बताओ','कैसे','help me','मदद'],
      ctx: null,
      action: { en: '📖 Help Guide', hi: '📖 सहायता गाइड', url: 'help.html' }
    },
    {
      id: 'login',
      match: ['login','sign in','account','officer login','admin','password',
              'officer','admin login','log in'],
      ctx: null,
      action: { en: '🔐 Login Page', hi: '🔐 लॉगिन पेज', url: 'login.html' }
    },
    {
      id: 'status_types',
      match: ['status types','what is status','pending','resolved','in progress',
              'status meaning','kya matlab','status kya hai','स्टेटस का मतलब'],
      ctx: null
    },
    {
      id: 'contact',
      match: ['contact','helpline','phone number','email','toll free',
              'number kya','contact number','संपर्क','हेल्पलाइन'],
      ctx: null
    },
    {
      id: 'emergency',
      match: ['emergency','urgent','help help','bachao','jaan ka khatra',
              'fire','aag','accident','life','danger','खतरा','आपातकाल'],
      ctx: null
    },
    {
      id: 'water_complaint',
      match: ['pani','paani','water','leakage','pipe','nali','sewage','naali',
              'water supply','tap','borewell','drain','flood','पानी','जल'],
      ctx: null
    },
    {
      id: 'electricity_complaint',
      match: ['bijli','bijlee','electricity','power cut','current','light',
              'transformer','meter','blackout','बिजली','करंट'],
      ctx: null
    },
    {
      id: 'police_complaint',
      match: ['police','fir','crime','theft','bribe','rishwat','corruption',
              'harassment','violence','thana','पुलिस','अपराध'],
      ctx: null
    },
    {
      id: 'thanks',
      match: ['thanks','thank you','dhanyawad','shukriya','thnx','thx','धन्यवाद','शुक्रिया'],
      ctx: null
    }
  ];

  // ── RESPONSES (EN + HI) ───────────────────────────
  var RESP = {
    en: {
      lang_prompt:
        '🙏 Welcome to <strong>GrievAI Assistant</strong>!\n\nPlease choose your preferred language to continue:',
      greeting:
        '🙏 Hello! I\'m <strong>GrievBot</strong>, your AI assistant for GrievAI Portal.\n\nI can help you:\n• 📝 File a complaint\n• 🔍 Track complaint status\n• 🏛️ Find the right department\n• ❓ Answer your questions\n\nWhat would you like to do?',
      file_complaint:
        '📝 <strong>How to File a Complaint:</strong>\n\n<strong>Step 1:</strong> Click "Lodge Complaint" on Home page\n<strong>Step 2:</strong> Fill Name, Mobile, State\n<strong>Step 3:</strong> Describe your complaint (AI detects department automatically)\n<strong>Step 4:</strong> Capture a live photo with GPS\n<strong>Step 5:</strong> Submit → Receive your <strong>Complaint ID</strong> via SMS\n\n💡 No login required!',
      track_complaint:
        '🔍 <strong>Track Your Complaint:</strong>\n\n1. Go to the <strong>Track</strong> page\n2. Enter your <strong>Complaint ID</strong>\n   Format: <code>GRIEVA/2025/XXXXXX</code>\n3. View real-time status + officer updates\n\nYour ID was sent via SMS when you filed.',
      complaint_id:
        '🆔 <strong>About Complaint ID:</strong>\n\nYour unique reference number looks like:\n📋 <code>GRIEVA/2025/783421</code>\n\n✅ Sent to your mobile via SMS after filing\n✅ Use it anytime to track status\n✅ Never share with unauthorized persons',
      departments:
        '🏛️ <strong>13 Departments Covered:</strong>\n\n💧 Water Supply & Sanitation\n⚡ Electricity Department\n🏥 Health & Family Welfare\n🚌 Transport Authority\n👮 Police Department\n🏙️ Municipal Corporation\n📋 Revenue & Land Records\n🎓 Department of Education\n🛒 Public Distribution (PDS)\n👷 Labour & Employment\n👩‍👧 Social Welfare\n🌾 Agriculture Department\n📡 Telecommunications',
      timeline:
        '⏱️ <strong>Resolution Timelines:</strong>\n\n🚨 Critical/Emergency → <strong>24–48 hours</strong>\n🔴 High Priority → <strong>7–15 working days</strong>\n🟡 Normal Complaints → <strong>30 working days</strong>\n\n📱 You get SMS updates at every step.\n⬆️ Auto-escalation if no action after 30 days.',
      escalate:
        '⬆️ <strong>How to Escalate:</strong>\n\n1. Auto-escalates after <strong>30 days</strong> of no action\n2. Call Helpline: <strong>1800-11-7781</strong> (Toll Free)\n3. Email: <strong>grievances@gov.in</strong>\n4. Escalate manually from your dashboard\n\nKeep your Complaint ID ready.',
      help:
        '📖 <strong>Quick Guide to GrievAI:</strong>\n\n1️⃣ Visit Home → Click <strong>Lodge Complaint</strong>\n2️⃣ Fill the form (no login needed)\n3️⃣ AI detects department automatically\n4️⃣ Capture live photo with GPS\n5️⃣ Get your <strong>Complaint ID</strong> via SMS\n6️⃣ Track anytime at Track page\n7️⃣ Escalate if not resolved in 30 days',
      login:
        '🔐 <strong>Login Information:</strong>\n\n👤 <strong>Citizen Login</strong> – View your complaint history\n🏛️ <strong>Officer Login</strong> – Manage assigned complaints\n⚙️ <strong>Admin Login</strong> – Full portal management\n\n💡 <strong>Tip:</strong> You can file & track complaints WITHOUT logging in!',
      status_types:
        '📊 <strong>Complaint Status Types:</strong>\n\n🔵 <strong>Under Review</strong> – Being verified\n🟡 <strong>In Progress</strong> – Officer actively working\n✅ <strong>Resolved</strong> – Issue fixed!\n⚫ <strong>Pending</strong> – Awaiting department response\n❌ <strong>Rejected</strong> – Did not meet criteria',
      contact:
        '📞 <strong>Contact & Helpline:</strong>\n\n☎️ Toll-Free: <strong>1800-11-7781</strong>\n✉️ Email: <strong>grievances@gov.in</strong>\n🕐 Hours: Mon–Sat, 9 AM – 6 PM\n🌐 Portal: grievai.gov.in',
      emergency:
        '🚨 <strong>EMERGENCY NUMBERS:</strong>\n\n🆘 Police: <strong>100</strong>\n🔥 Fire: <strong>101</strong>\n🏥 Ambulance: <strong>102 / 108</strong>\n👮 Women Helpline: <strong>1091</strong>\n☎️ General Emergency: <strong>112</strong>\n\n⚠️ For life-threatening situations, call 112 immediately!',
      water_complaint:
        '💧 <strong>Water Department Complaints:</strong>\n\nCovers: Leakage, pipe burst, water shortage, sewage overflow, dirty water, borewell issues.\n\n🤖 Just describe your issue in the complaint form — AI will automatically route it to <strong>Water Supply & Sanitation</strong>.\n\nWant to file now?',
      electricity_complaint:
        '⚡ <strong>Electricity Department Complaints:</strong>\n\nCovers: Power cuts, billing errors, transformer failure, meter issues, live wire hazards.\n\n🤖 AI will auto-route your complaint to <strong>Electricity Department</strong>.\n\nWant to file now?',
      police_complaint:
        '👮 <strong>Police Department Complaints:</strong>\n\nCovers: FIR issues, corruption, harassment, cybercrime, theft.\n\n⚠️ For emergencies, call <strong>100 or 112</strong> immediately!\n\nFor non-emergency complaints, file through GrievAI portal.',
      thanks:
        '🙏 You\'re welcome! GrievAI is here to help citizens like you.\n\nYour complaint matters to us. Is there anything else I can help with?',
      fallback:
        '🤔 I didn\'t quite understand that. Let me help you with:\n\n• Type <strong>"file complaint"</strong> – to lodge a grievance\n• Type <strong>"track"</strong> – to check complaint status\n• Type <strong>"help"</strong> – for a full guide\n• Type <strong>"departments"</strong> – to see all departments\n\nOr describe your problem and I\'ll assist!',
      // Suggestion labels
      s_file:   '📝 File Complaint',
      s_track:  '🔍 Track Complaint',
      s_dept:   '🏛️ Departments',
      s_help:   '❓ Help',
      s_id:     '🆔 Complaint ID',
      s_esc:    '⬆️ Escalate',
      s_contact:'📞 Helpline',
      s_status: '📊 Status Types',
      s_emergency:'🚨 Emergency',
    },

    hi: {
      lang_prompt:
        '🙏 <strong>GrievAI सहायक</strong> में आपका स्वागत है!\n\nकृपया अपनी पसंदीदा भाषा चुनें:',
      greeting:
        '🙏 नमस्कार! मैं <strong>GrievBot</strong> हूँ, GrievAI पोर्टल का AI सहायक।\n\nमैं आपकी इन कामों में मदद कर सकता हूँ:\n• 📝 शिकायत दर्ज करें\n• 🔍 शिकायत की स्थिति ट्रैक करें\n• 🏛️ सही विभाग खोजें\n• ❓ आपके सवालों के जवाब दें\n\nआप क्या जानना चाहते हैं?',
      file_complaint:
        '📝 <strong>शिकायत कैसे दर्ज करें:</strong>\n\n<strong>चरण 1:</strong> होम पेज पर "शिकायत दर्ज करें" पर क्लिक करें\n<strong>चरण 2:</strong> नाम, मोबाइल, राज्य भरें\n<strong>चरण 3:</strong> शिकायत विवरण लिखें (AI विभाग खुद पहचानेगा)\n<strong>चरण 4:</strong> GPS के साथ लाइव फोटो लें\n<strong>चरण 5:</strong> सबमिट करें → SMS पर <strong>Complaint ID</strong> पाएं\n\n💡 लॉगिन की जरूरत नहीं!',
      track_complaint:
        '🔍 <strong>शिकायत कैसे ट्रैक करें:</strong>\n\n1. <strong>ट्रैक</strong> पेज पर जाएं\n2. अपना <strong>Complaint ID</strong> डालें\n   फॉर्मेट: <code>GRIEVA/2025/XXXXXX</code>\n3. रियल-टाइम स्टेटस और अधिकारी अपडेट देखें\n\nआपका ID शिकायत दर्ज करने पर SMS से मिला था।',
      complaint_id:
        '🆔 <strong>Complaint ID के बारे में:</strong>\n\nआपका विशेष संदर्भ नंबर ऐसा दिखता है:\n📋 <code>GRIEVA/2025/783421</code>\n\n✅ शिकायत दर्ज करने पर SMS से मिलता है\n✅ किसी भी समय स्टेटस ट्रैक करने के लिए उपयोग करें\n✅ अनधिकृत व्यक्तियों के साथ साझा न करें',
      departments:
        '🏛️ <strong>13 विभाग शामिल हैं:</strong>\n\n💧 जल आपूर्ति और स्वच्छता\n⚡ बिजली विभाग\n🏥 स्वास्थ्य और परिवार कल्याण\n🚌 परिवहन प्राधिकरण\n👮 पुलिस विभाग\n🏙️ नगर निगम\n📋 राजस्व और भूमि अभिलेख\n🎓 शिक्षा विभाग\n🛒 सार्वजनिक वितरण प्रणाली (PDS)\n👷 श्रम और रोजगार\n👩‍👧 समाज कल्याण\n🌾 कृषि विभाग\n📡 दूरसंचार',
      timeline:
        '⏱️ <strong>समाधान समयसीमा:</strong>\n\n🚨 आपातकालीन → <strong>24–48 घंटे</strong>\n🔴 उच्च प्राथमिकता → <strong>7–15 कार्य दिवस</strong>\n🟡 सामान्य शिकायतें → <strong>30 कार्य दिवस</strong>\n\n📱 हर कदम पर SMS अपडेट मिलेगा।\n⬆️ 30 दिनों में कार्रवाई न होने पर स्वतः एस्केलेशन।',
      escalate:
        '⬆️ <strong>एस्केलेशन कैसे करें:</strong>\n\n1. 30 दिनों में कोई कार्रवाई नहीं → स्वतः एस्केलेशन\n2. हेल्पलाइन: <strong>1800-11-7781</strong> (टोल फ्री)\n3. ईमेल: <strong>grievances@gov.in</strong>\n4. डैशबोर्ड से मैन्युअल एस्केलेशन\n\nअपना Complaint ID तैयार रखें।',
      help:
        '📖 <strong>GrievAI उपयोग गाइड:</strong>\n\n1️⃣ होम पर जाएं → <strong>शिकायत दर्ज करें</strong> पर क्लिक करें\n2️⃣ फॉर्म भरें (लॉगिन की जरूरत नहीं)\n3️⃣ AI विभाग खुद पहचानेगा\n4️⃣ GPS के साथ लाइव फोटो लें\n5️⃣ SMS पर <strong>Complaint ID</strong> पाएं\n6️⃣ ट्रैक पेज पर कभी भी ट्रैक करें\n7️⃣ 30 दिनों में हल न हो तो एस्केलेट करें',
      login:
        '🔐 <strong>लॉगिन जानकारी:</strong>\n\n👤 <strong>नागरिक लॉगिन</strong> – पुरानी शिकायतें देखें\n🏛️ <strong>अधिकारी लॉगिन</strong> – असाइन शिकायतें प्रबंधित करें\n⚙️ <strong>एडमिन लॉगिन</strong> – पूर्ण प्रबंधन\n\n💡 <strong>टिप:</strong> लॉगिन के बिना भी शिकायत दर्ज और ट्रैक करें!',
      status_types:
        '📊 <strong>शिकायत स्टेटस प्रकार:</strong>\n\n🔵 <strong>समीक्षाधीन</strong> – सत्यापित हो रही है\n🟡 <strong>प्रगति में</strong> – अधिकारी काम कर रहा है\n✅ <strong>हल हो गई</strong> – समस्या ठीक हो गई!\n⚫ <strong>लंबित</strong> – विभागीय प्रतिक्रिया की प्रतीक्षा\n❌ <strong>अस्वीकृत</strong> – मानदंड पूरे नहीं किए',
      contact:
        '📞 <strong>संपर्क और हेल्पलाइन:</strong>\n\n☎️ टोल-फ्री: <strong>1800-11-7781</strong>\n✉️ ईमेल: <strong>grievances@gov.in</strong>\n🕐 समय: सोम–शनि, सुबह 9 – शाम 6\n🌐 पोर्टल: grievai.gov.in',
      emergency:
        '🚨 <strong>आपातकालीन नंबर:</strong>\n\n🆘 पुलिस: <strong>100</strong>\n🔥 अग्निशमन: <strong>101</strong>\n🏥 एम्बुलेंस: <strong>102 / 108</strong>\n👮 महिला हेल्पलाइन: <strong>1091</strong>\n☎️ सामान्य आपातकाल: <strong>112</strong>\n\n⚠️ जीवन खतरे में हो तो तुरंत 112 डायल करें!',
      water_complaint:
        '💧 <strong>जल विभाग शिकायतें:</strong>\n\nकवर करता है: पानी रिसाव, पाइप फटना, पानी की कमी, सीवेज ओवरफ्लो, गंदा पानी।\n\n🤖 AI खुद आपकी शिकायत को <strong>जल आपूर्ति और स्वच्छता</strong> विभाग में भेजेगा।\n\nक्या आप अभी शिकायत दर्ज करना चाहते हैं?',
      electricity_complaint:
        '⚡ <strong>बिजली विभाग शिकायतें:</strong>\n\nकवर करता है: बिजली कटौती, बिलिंग त्रुटि, ट्रांसफार्मर खराबी, मीटर समस्या।\n\n🤖 AI खुद आपकी शिकायत को <strong>बिजली विभाग</strong> में भेजेगा।\n\nक्या आप अभी शिकायत दर्ज करना चाहते हैं?',
      police_complaint:
        '👮 <strong>पुलिस विभाग शिकायतें:</strong>\n\nकवर करता है: FIR, भ्रष्टाचार, उत्पीड़न, साइबर अपराध, चोरी।\n\n⚠️ आपातकाल में तुरंत <strong>100 या 112</strong> डायल करें!\n\nगैर-आपातकालीन शिकायत के लिए GrievAI पोर्टल का उपयोग करें।',
      thanks:
        '🙏 आपका स्वागत है! GrievAI आप जैसे नागरिकों की मदद के लिए है।\n\nआपकी शिकायत हमारे लिए महत्वपूर्ण है। क्या और कोई मदद चाहिए?',
      fallback:
        '🤔 मुझे ठीक से समझ नहीं आया। मैं इनमें मदद कर सकता हूँ:\n\n• <strong>"शिकायत दर्ज"</strong> लिखें – शिकायत दर्ज करने के लिए\n• <strong>"ट्रैक"</strong> लिखें – स्टेटस जाँचने के लिए\n• <strong>"मदद"</strong> लिखें – पूरी गाइड के लिए\n• <strong>"विभाग"</strong> लिखें – सभी विभाग देखने के लिए\n\nया अपनी समस्या बताएं, मैं मदद करूँगा!',
      s_file:   '📝 शिकायत दर्ज',
      s_track:  '🔍 ट्रैक करें',
      s_dept:   '🏛️ विभाग',
      s_help:   '❓ मदद',
      s_id:     '🆔 Complaint ID',
      s_esc:    '⬆️ एस्केलेट',
      s_contact:'📞 हेल्पलाइन',
      s_status: '📊 स्टेटस प्रकार',
      s_emergency:'🚨 आपातकाल',
    }
  };

  // Suggestions per intent
  var SUGGESTIONS = {
    greeting:              function(l){ return [R(l,'s_file'),R(l,'s_track'),R(l,'s_dept'),R(l,'s_help')]; },
    file_complaint:        function(l){ return [R(l,'s_track'),R(l,'s_id'),R(l,'s_dept')]; },
    track_complaint:       function(l){ return [R(l,'s_file'),R(l,'s_id'),R(l,'s_status')]; },
    complaint_id:          function(l){ return [R(l,'s_track'),R(l,'s_file'),R(l,'s_contact')]; },
    departments:           function(l){ return [R(l,'s_file'),R(l,'s_track'),R(l,'s_help')]; },
    timeline:              function(l){ return [R(l,'s_track'),R(l,'s_esc'),R(l,'s_contact')]; },
    escalate:              function(l){ return [R(l,'s_contact'),R(l,'s_track'),R(l,'s_file')]; },
    help:                  function(l){ return [R(l,'s_file'),R(l,'s_track'),R(l,'s_dept')]; },
    login:                 function(l){ return [R(l,'s_file'),R(l,'s_track'),R(l,'s_help')]; },
    status_types:          function(l){ return [R(l,'s_track'),R(l,'s_file'),R(l,'s_esc')]; },
    contact:               function(l){ return [R(l,'s_file'),R(l,'s_track'),R(l,'s_help')]; },
    emergency:             function(l){ return [R(l,'s_file'),R(l,'s_contact')]; },
    water_complaint:       function(l){ return [R(l,'s_file'),R(l,'s_track'),R(l,'s_dept')]; },
    electricity_complaint: function(l){ return [R(l,'s_file'),R(l,'s_track'),R(l,'s_dept')]; },
    police_complaint:      function(l){ return [R(l,'s_file'),R(l,'s_emergency'),R(l,'s_contact')]; },
    thanks:                function(l){ return [R(l,'s_file'),R(l,'s_track'),R(l,'s_help')]; },
    fallback:              function(l){ return [R(l,'s_file'),R(l,'s_track'),R(l,'s_dept'),R(l,'s_help')]; }
  };

  function R(lang, key) {
    return (RESP[lang] || RESP.en)[key] || (RESP.en)[key];
  }

  // ── CLASSIFY INPUT ────────────────────────────────
  function classify(rawText) {
    var normalized = normalizeHinglish(rawText);
    var lower = normalized.toLowerCase();

    var best = null, bestScore = 0;

    INTENTS.forEach(function(intent) {
      var score = 0;
      intent.match.forEach(function(pattern) {
        if (lower.indexOf(pattern) !== -1) {
          score += pattern.split(' ').length > 1 ? 4 : (pattern.length > 5 ? 3 : 2);
        }
      });
      if (score > bestScore) { bestScore = score; best = intent; }
    });

    return bestScore >= 2 ? best : null;
  }

  // ── BUILD WIDGET ──────────────────────────────────
  function buildWidget() {
    var w = document.createElement('div');
    w.id = 'cbWidget';
    w.innerHTML = (
      '<button class="cb-fab" id="cbFab" aria-label="Open AI Assistant">' +
        '<span class="cb-fab-icon">🤖</span>' +
        '<span class="cb-fab-pulse"></span>' +
        '<span class="cb-fab-badge" id="cbBadge">1</span>' +
      '</button>' +
      '<div class="cb-panel" id="cbPanel" aria-hidden="true">' +
        '<div class="cb-header">' +
          '<div class="cb-header-info">' +
            '<div class="cb-header-avatar">🤖</div>' +
            '<div>' +
              '<div class="cb-header-name">GrievBot</div>' +
              '<div class="cb-header-status"><span class="cb-online-dot"></span>Online · AI Assistant</div>' +
            '</div>' +
          '</div>' +
          '<div class="cb-header-actions">' +
            '<button class="cb-icon-btn" id="cbVoiceBtn" title="Voice Input" style="display:none;">🎤</button>' +
            '<button class="cb-icon-btn" id="cbClearBtn" title="Clear Chat">🗑️</button>' +
            '<button class="cb-icon-btn" id="cbCloseBtn" title="Close">✕</button>' +
          '</div>' +
        '</div>' +
        '<div class="cb-messages" id="cbMessages"></div>' +
        '<div class="cb-input-area">' +
          '<div class="cb-quick-replies" id="cbQuickReplies"></div>' +
          '<div class="cb-input-row">' +
            '<input id="cbInput" class="cb-input" placeholder="Type your question…" autocomplete="off" maxlength="400">' +
            '<button class="cb-send-btn" id="cbSend">➤</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    document.body.appendChild(w);
  }

  // ── RENDER HELPERS ────────────────────────────────
  function renderText(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:#edf2f7;padding:1px 5px;border-radius:3px;font-size:0.82em;color:#4a5568;">$1</code>')
      .replace(/\n/g, '<br>');
  }

  function appendMessage(text, role, action) {
    var msgs = document.getElementById('cbMessages');
    if (!msgs) return;

    var wrap = document.createElement('div');
    wrap.className = 'cb-msg cb-msg--' + role;

    if (role === 'bot') {
      var av = document.createElement('div');
      av.className = 'cb-avatar';
      av.textContent = '🤖';
      wrap.appendChild(av);
    }

    var bubble = document.createElement('div');
    bubble.className = 'cb-bubble';
    bubble.innerHTML = renderText(text);

    if (action) {
      var aBtn = document.createElement('a');
      aBtn.className = 'cb-action-btn';
      aBtn.href = action.url;
      aBtn.innerHTML = '<br>' + (action[SESSION.lang] || action.en);
      bubble.appendChild(aBtn);
    }

    var ts = document.createElement('span');
    ts.className = 'cb-ts';
    ts.textContent = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    bubble.appendChild(ts);

    wrap.appendChild(bubble);
    msgs.appendChild(wrap);
    scrollDown();
    return wrap;
  }

  function appendTyping() {
    var msgs = document.getElementById('cbMessages');
    var wrap = document.createElement('div');
    wrap.className = 'cb-msg cb-msg--bot';
    wrap.id = 'cbTyping';
    wrap.innerHTML = '<div class="cb-avatar">🤖</div><div class="cb-bubble cb-typing"><span></span><span></span><span></span></div>';
    msgs.appendChild(wrap);
    scrollDown();
    return wrap;
  }

  function appendSuggestions(suggs) {
    if (!suggs || !suggs.length) return;
    var msgs = document.getElementById('cbMessages');
    var row = document.createElement('div');
    row.className = 'cb-suggestions';
    suggs.slice(0,4).forEach(function(s) {
      var btn = document.createElement('button');
      btn.className = 'cb-sugg-btn';
      btn.textContent = s;
      btn.onclick = function(){ row.remove(); sendMessage(s); };
      row.appendChild(btn);
    });
    msgs.appendChild(row);
    scrollDown();
  }

  function scrollDown() {
    var m = document.getElementById('cbMessages');
    if (m) m.scrollTop = m.scrollHeight;
  }

  // ── LANGUAGE SELECTION SCREEN ─────────────────────
  function showLangPicker() {
    var msgs = document.getElementById('cbMessages');
    var qr   = document.getElementById('cbQuickReplies');
    if (!msgs) return;

    var lang = SESSION.lang || 'en';
    var promptText = RESP[lang].lang_prompt;

    // Bot prompt
    appendMessage(promptText, 'bot');

    // Language buttons (NOT suggestion chips – proper big buttons)
    var row = document.createElement('div');
    row.className = 'cb-lang-picker';
    row.id = 'cbLangPicker';

    [
      { code: 'en',       label: '🇬🇧 English',   sub: 'Continue in English'   },
      { code: 'hi',       label: '🇮🇳 हिन्दी',      sub: 'हिंदी में जारी रखें'     },
      { code: 'hinglish', label: '🔀 Hinglish',   sub: 'Hindi + English mix'   }
    ].forEach(function(opt) {
      var btn = document.createElement('button');
      btn.className = 'cb-lang-btn';
      btn.innerHTML = '<span class="cb-lang-main">' + opt.label + '</span><span class="cb-lang-sub">' + opt.sub + '</span>';
      btn.onclick = function() {
        selectLanguage(opt.code);
        row.remove();
      };
      row.appendChild(btn);
    });

    msgs.appendChild(row);
    scrollDown();

    // Hide text input until lang is chosen
    var inp = document.getElementById('cbInput');
    var sendBtn = document.getElementById('cbSend');
    if (inp) { inp.disabled = true; inp.placeholder = 'Please select a language first…'; }
    if (sendBtn) sendBtn.disabled = true;
    if (qr) qr.innerHTML = '';
  }

  function selectLanguage(code) {
    // Hinglish → use English responses but accept Hindi input too
    SESSION.lang  = (code === 'hinglish') ? 'en' : code;
    SESSION.step  = 'chatting';
    SESSION.hinglishMode = (code === 'hinglish');

    var inp = document.getElementById('cbInput');
    var sendBtn = document.getElementById('cbSend');
    if (inp) {
      inp.disabled = false;
      inp.placeholder = SESSION.lang === 'hi' ? 'अपना प्रश्न टाइप करें…' : 'Type your question…';
      inp.focus();
    }
    if (sendBtn) sendBtn.disabled = false;

    // Show greeting in chosen language
    setTimeout(function() {
      var strings = RESP[SESSION.lang] || RESP.en;
      appendMessage(strings.greeting, 'bot');
      appendSuggestions([strings.s_file, strings.s_track, strings.s_dept, strings.s_help]);
    }, 300);
  }

  // ── SEND MESSAGE ──────────────────────────────────
  function sendMessage(text) {
    text = (text || '').trim();
    if (!text) return;

    // Lang not chosen yet
    if (SESSION.step === 'lang_select') return;

    appendMessage(text, 'user');
    SESSION.history.push({ role:'user', text:text });

    var inp = document.getElementById('cbInput');
    if (inp) inp.value = '';

    var typing = appendTyping();
    var delay = 500 + Math.min(text.length * 12, 900);

    setTimeout(function() {
      var t = document.getElementById('cbTyping');
      if (t) t.remove();

      var lang    = SESSION.lang || 'en';
      var strings = RESP[lang] || RESP.en;
      var intent  = classify(text);
      var resp, suggs, action;

      if (intent) {
        resp   = strings[intent.id] || strings.fallback;
        suggs  = (SUGGESTIONS[intent.id] || SUGGESTIONS.fallback)(lang);
        action = intent.action || null;
      } else {
        resp   = strings.fallback;
        suggs  = SUGGESTIONS.fallback(lang);
        action = null;
      }

      appendMessage(resp, 'bot', action);
      appendSuggestions(suggs);
      SESSION.history.push({ role:'bot', text:resp });
    }, delay);
  }

  // ── VOICE INPUT ───────────────────────────────────
  function setupVoice() {
    var SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
    var btn = document.getElementById('cbVoiceBtn');
    if (!SR || !btn) return;

    btn.style.display = 'flex';
    var rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;

    var recording = false;

    btn.onclick = function() {
      if (recording) { rec.stop(); return; }
      rec.lang = SESSION.lang === 'hi' ? 'hi-IN' : 'en-IN';
      try { rec.start(); } catch(e){}
    };
    rec.onstart  = function(){ recording = true;  btn.textContent = '🔴'; btn.title = 'Listening…'; };
    rec.onend    = function(){ recording = false; btn.textContent = '🎤'; btn.title = 'Voice Input'; };
    rec.onerror  = function(){ recording = false; btn.textContent = '🎤'; };
    rec.onresult = function(e) {
      var transcript = e.results[0][0].transcript;
      var inp = document.getElementById('cbInput');
      if (inp) inp.value = transcript;
      sendMessage(transcript);
    };
  }

  // ── BIND EVENTS ───────────────────────────────────
  function bindEvents() {
    var fab      = document.getElementById('cbFab');
    var panel    = document.getElementById('cbPanel');
    var closeBtn = document.getElementById('cbCloseBtn');
    var clearBtn = document.getElementById('cbClearBtn');
    var sendBtn  = document.getElementById('cbSend');
    var input    = document.getElementById('cbInput');
    var badge    = document.getElementById('cbBadge');

    function openPanel() {
      panel.classList.add('open');
      panel.setAttribute('aria-hidden','false');
      badge.style.display = 'none';
    }
    function closePanel() {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden','true');
    }

    fab.onclick = function(){ panel.classList.contains('open') ? closePanel() : openPanel(); };
    closeBtn.onclick = closePanel;

    clearBtn.onclick = function() {
      var msgs = document.getElementById('cbMessages');
      if (msgs) msgs.innerHTML = '';
      SESSION.history = [];
      SESSION.step = 'lang_select';
      SESSION.lang = null;
      var inp = document.getElementById('cbInput');
      if (inp) { inp.disabled = true; inp.placeholder = 'Please select a language first…'; }
      var sb = document.getElementById('cbSend');
      if (sb) sb.disabled = true;
      showLangPicker();
    };

    sendBtn.onclick = function(){ sendMessage(input.value); };
    input.onkeydown = function(e){ if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); sendMessage(input.value); } };

    // Sync language when site language changes
    document.addEventListener('click', function(e) {
      if (e.target.classList.contains('nav-lang-item')) {
        setTimeout(function(){
          var saved = localStorage.getItem('grievai_lang') || 'en';
          if (SESSION.lang && SESSION.lang !== saved && RESP[saved]) {
            SESSION.lang = saved;
            var inp = document.getElementById('cbInput');
            if (inp) inp.placeholder = saved === 'hi' ? 'अपना प्रश्न टाइप करें…' : 'Type your question…';
          }
        }, 100);
      }
    });

    // Close on outside click
    document.onclick = function(e) {
      if (panel.classList.contains('open') && !panel.contains(e.target) && !fab.contains(e.target)) {
        closePanel();
      }
    };
  }

  // ── INIT ──────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    buildWidget();
    bindEvents();
    setupVoice();
    // Small delay so panel renders first
    setTimeout(showLangPicker, 200);
  });

})();
