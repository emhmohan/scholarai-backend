import { groqChat } from '../utils/groqClient.js';
import logger from '../utils/logger.js';

const VERIFIED_URLS = {
  // International
  'Fulbright':                    'https://foreign.fulbrightonline.org',
  'Chevening':                    'https://www.chevening.org/scholarships',
  'DAAD':                         'https://www.daad.de/en/study-and-research-in-germany/scholarships',
  'Erasmus Mundus':               'https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters',
  'Commonwealth':                 'https://cscuk.fcdo.gov.uk/scholarships',
  'Gates Cambridge':              'https://www.gatescambridge.org/apply',
  'Rhodes':                       'https://www.rhodeshouse.ox.ac.uk/scholarships',
  'AAUW':                         'https://www.aauw.org/resources/programs/fellowships-grants',
  'Inlaks':                       'https://www.inlaksfoundation.org/scholarships',
  'Rotary':                       'https://www.rotary.org/en/our-programs/scholarships',
  'MEXT':                         'https://www.studyinjapan.go.jp/en/planning/scholarship',
  'Vanier':                       'https://vanier.gc.ca/en/home-accueil.html',
  'ADB':                          'https://www.adb.org/work-with-us/careers/japan-scholarship-program',
  'KGSP':                         'https://www.niied.go.kr/user/nd35203.do',
  'Hubert Humphrey':              'https://www.humphreyfellowship.org',
  'Australia Awards':             'https://www.australiaawardsindia.org',
  'New Zealand':                  'https://www.universitiesnz.ac.nz/scholarships',
  'Swedish Institute':            'https://si.se/en/apply/scholarships',
  'Holland Scholarship':          'https://www.studyinholland.nl/finances/scholarships/find-scholarships/holland-scholarship',
  'Heinrich Boll':                'https://www.boell.de/en/foundation/scholarships',
  'KAIST':                        'https://admission.kaist.ac.kr/intl-graduate',
  'NTU':                          'https://www.ntu.edu.sg/admissions/graduate/research-programmes/financial-assistance',
  'NUS':                          'https://nus.edu.sg/oam/scholarships',
  'ETH Zurich':                   'https://ethz.ch/en/studies/financial/scholarships/excellencescholarship.html',
  'Oxford':                       'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search',
  'Cambridge':                    'https://www.cam.ac.uk/fees-and-funding/funding/grants-and-other-funding',

  // India National
  'PMRF':                         'https://pmrf.in',
  'PM Research Fellowship':       'https://pmrf.in',
  'Prime Minister Research':      'https://pmrf.in',
  'CSIR-UGC':                     'https://csirhrdg.res.in/Home/Index/1/Default/2408/67',
  'CSIR UGC':                     'https://csirhrdg.res.in/Home/Index/1/Default/2408/67',
  'UGC NET':                      'https://csirhrdg.res.in/Home/Index/1/Default/2408/67',
  'DST INSPIRE':                  'https://www.inspire-dst.gov.in/scholarship.html',
  'INSPIRE':                      'https://www.inspire-dst.gov.in/scholarship.html',
  'AICTE':                        'https://www.aicte-india.org/schemes/students-development-schemes/NDF',
  'UGC':                          'https://ugc.ac.in/page/Scholarships-and-Fellowships.aspx',
  'DBT':                          'https://dbtindia.gov.in/schemes-programmes/scholarshipsfellowships',
  'ICMR':                         'https://icmr.gov.in/content/fellowships-and-scholarships',
  'ICAR':                         'https://icar.org.in/content/national-talent-scholarship',
  'National Scholarship':         'https://scholarships.gov.in',
  'NSP':                          'https://scholarships.gov.in',
  'Central Sector':               'https://scholarships.gov.in',
  'Post Matric':                  'https://scholarships.gov.in',
  'Pre Matric':                   'https://scholarships.gov.in',
  'Merit cum Means':              'https://scholarships.gov.in',
  'Minority':                     'https://scholarships.gov.in',
  'OBC':                          'https://scholarships.gov.in',
  'SC ST':                        'https://scholarships.gov.in',

  // India Private Corporate
  'Tata':                         'https://www.tatatrusts.org/our-work/individual-grants/education-grants',
  'Infosys':                      'https://www.infosys.com/infosys-foundation/initiatives/education.html',
  'Reliance':                     'https://www.reliancefoundation.org/scholarships',
  'Wipro':                        'https://www.wiprogivesback.org',
  'L&T':                          'https://www.ltfs.com/companies/lt-financial-services/csr/scholarship.html',
  'Mahindra':                     'https://www.mahindrarise.com/csr-activities/education',
  'HDFC':                         'https://www.hdfcbank.com/personal/resources/learning-centre/others/hdfcbank-educational-crisis-scholarship-support',
  'Google':                       'https://buildyourfuture.withgoogle.com/scholarships',
  'Microsoft':                    'https://careers.microsoft.com/v2/global/en/students',
  'Adobe':                        'https://www.adobe.com/about-adobe/fast-facts/adobe-research-women-in-technology-scholarship.html',
  'Aga Khan':                     'https://www.akdn.org/our-agencies/aga-khan-foundation/international-scholarship-programme',
  'Sitaram Jindal':               'https://www.sitaramjindalfoundation.org/scholarship',
  'Buddy4Study':                  'https://www.buddy4study.com',
  'Vidyasaarathi':                'https://www.vidyasaarathi.co.in',
  'Kotak':                        'https://www.kotakeducation.com',
  'IDFC':                         'https://www.idfcfirstbank.com/personal-banking/accounts/scholarships',

  // Tamil Nadu Specific
  'Tamil Nadu':                   'https://tnscholarship.gov.in',
  'TN Scholarship':               'https://tnscholarship.gov.in',
  'Chief Minister':               'https://tnscholarship.gov.in',
  'BC MBC':                       'https://tnscholarship.gov.in',
  'BC':                           'https://tnscholarship.gov.in',
  'MBC':                          'https://tnscholarship.gov.in',
  'Anna University':              'https://www.annauniv.edu/page/scholarships',
  'Tamil Nadu Government':        'https://tnscholarship.gov.in',
  'TNSF':                         'https://tnscholarship.gov.in',
  'Amma':                         'https://tnscholarship.gov.in',
  'Dravidam Munetra':             'https://tnscholarship.gov.in',
  'Dr Ambedkar':                  'https://tnscholarship.gov.in',
  'Puratchi Thalaivar':           'https://tnscholarship.gov.in',
};

const getVerifiedUrl = (title, provider) => {
  const text = `${title} ${provider}`.toLowerCase();
  for (const [key, url] of Object.entries(VERIFIED_URLS)) {
    if (text.includes(key.toLowerCase())) return url;
  }
  // Fallback: Google search always works
  const query = encodeURIComponent(`${title} ${provider} official scholarship apply`);
  return `https://www.google.com/search?q=${query}`;
};

const scholarshipAgent = async (userProfile) => {
  logger.info('Scholarship agent started');

  const targetCountries = userProfile?.targetCountries || [];
  const userState       = userProfile?.state || '';
  const isIndia         = targetCountries.some((c) => c.toLowerCase().includes('india'));

  // STEP 1 — Profile Analysis
  logger.info('Step 1: Analyzing profile...');
  const step1 = await groqChat('llama-3.1-8b-instant', [
    {
      role: 'system',
      content: `You are an expert scholarship counselor. Analyze student profiles and return ONLY valid JSON, no markdown.`,
    },
    {
      role: 'user',
      content: `Analyze this student profile and return JSON:
Profile: ${JSON.stringify(userProfile)}

Return this exact JSON structure:
{
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "competitiveScore": 75,
  "profileSummary": "Brief summary of the student"
}`,
    },
  ]);

  let profileAnalysis;
  try {
    profileAnalysis = JSON.parse(step1.replace(/```json|```/g, '').trim());
  } catch {
    profileAnalysis = { strengths: [], weaknesses: [], competitiveScore: 70, profileSummary: step1 };
  }

  // STEP 2 — Scholarship Discovery
  logger.info('Step 2: Discovering scholarships...');

  const indiaPrompt = `Find 8 real scholarships for this Indian student:
Profile: ${JSON.stringify(userProfile)}
State: ${userState}

Include a mix of:
- National: PM Research Fellowship (PMRF), CSIR-UGC NET Fellowship, DST INSPIRE, AICTE, UGC, DBT, ICMR
- State-specific for ${userState || 'India'}: Tamil Nadu government scholarships, Chief Minister scholarship, BC/MBC/SC/ST scholarships, Amma scholarships
- Private: Tata, Infosys, Reliance Foundation, L&T, Wipro, HDFC, Sitaram Jindal, Buddy4Study
- International available to Indians: Commonwealth, DAAD, Erasmus Mundus, Inlaks, Gates Cambridge, Australia Awards

Return a JSON array of exactly 8 scholarships (DO NOT include URLs):
[
  {
    "title": "Prime Minister Research Fellowship",
    "provider": "Ministry of Education, India",
    "amount": "Rs. 70,000-80,000 per month + research grant",
    "deadline": "2025-10-15",
    "requirements": ["BTech/BE with 8.0+ CGPA", "Indian citizen", "Research interest"],
    "country": "India",
    "description": "Prestigious fellowship for top engineering graduates to pursue PhD at IITs/IISc"
  }
]`;

  const internationalPrompt = `Find 8 real scholarships for this student:
Profile: ${JSON.stringify(userProfile)}
Target Countries: ${targetCountries.join(', ')}
Profile Analysis: ${JSON.stringify(profileAnalysis)}

Return a JSON array of exactly 8 scholarships (DO NOT include URLs):
[
  {
    "title": "Fulbright Foreign Student Program",
    "provider": "U.S. Department of State",
    "amount": "Full funding + stipend",
    "deadline": "2025-10-15",
    "requirements": ["Bachelor degree", "Leadership", "English proficiency"],
    "country": "USA",
    "description": "Prestigious US government scholarship for international students"
  }
]

Include real scholarships based on target countries: Fulbright, Chevening, DAAD, Erasmus Mundus, Commonwealth, Gates Cambridge, Rhodes, AAUW, Australia Awards, Swedish Institute, Holland Scholarship.`;

  const step2 = await groqChat('llama-3.3-70b-versatile', [
    {
      role: 'system',
      content: `You are a scholarship database expert. Return ONLY valid JSON arrays, no markdown.`,
    },
    {
      role: 'user',
      content: isIndia ? indiaPrompt : internationalPrompt,
    },
  ]);

  let scholarships;
  try {
    const cleaned = step2.replace(/```json|```/g, '').trim();
    const match   = cleaned.match(/\[[\s\S]*\]/);
    scholarships  = JSON.parse(match ? match[0] : cleaned);
  } catch {
    scholarships = [];
  }

  // Inject verified URLs — never trust AI-generated URLs
  scholarships = scholarships.map((s) => ({
    ...s,
    url: getVerifiedUrl(s.title, s.provider),
  }));

  // STEP 3 — Match Scoring
  logger.info('Step 3: Scoring matches...');
  const step3 = await groqChat('llama-3.1-8b-instant', [
    {
      role: 'system',
      content: `You are a scholarship matching expert. Return ONLY valid JSON, no markdown.`,
    },
    {
      role: 'user',
      content: `Score each scholarship for this student (0-100):
Profile: ${JSON.stringify(userProfile)}
Scholarships: ${JSON.stringify(scholarships)}

Return JSON array:
[
  {
    "index": 0,
    "matchScore": 85,
    "aiAnalysis": {
      "strengths": ["Why student is strong"],
      "weaknesses": ["What might hurt chances"],
      "tips": ["Actionable tip 1", "Actionable tip 2"]
    }
  }
]`,
    },
  ]);

  let scores;
  try {
    const cleaned = step3.replace(/```json|```/g, '').trim();
    const match   = cleaned.match(/\[[\s\S]*\]/);
    scores        = JSON.parse(match ? match[0] : cleaned);
  } catch {
    scores = scholarships.map((_, i) => ({
      index: i, matchScore: 70,
      aiAnalysis: { strengths: [], weaknesses: [], tips: [] },
    }));
  }

  const scoredScholarships = scholarships.map((s, i) => {
    const score = scores.find((sc) => sc.index === i) || { matchScore: 70, aiAnalysis: {} };
    return { ...s, matchScore: score.matchScore, aiAnalysis: score.aiAnalysis, status: 'saved' };
  });

  // STEP 4 — Strategy
  logger.info('Step 4: Generating strategy...');
  const step4 = await groqChat('llama-3.1-8b-instant', [
    {
      role: 'system',
      content: `You are a scholarship strategy expert. Return ONLY valid JSON, no markdown.`,
    },
    {
      role: 'user',
      content: `Create an application strategy:
Profile: ${JSON.stringify(userProfile)}
Top Scholarships: ${JSON.stringify(scoredScholarships.slice(0, 3))}
State: ${userState}
Target Countries: ${targetCountries.join(', ')}

Return JSON:
{
  "timeline": [{ "month": "Month 1-2", "tasks": ["Task 1", "Task 2"] }],
  "topPicks": ["Scholarship 1", "Scholarship 2"],
  "quickWins": ["Easy action 1", "Easy action 2"],
  "overallAdvice": "Strategic advice"
}`,
    },
  ]);

  let strategy;
  try {
    strategy = JSON.parse(step4.replace(/```json|```/g, '').trim());
  } catch {
    strategy = { timeline: [], topPicks: [], quickWins: [], overallAdvice: step4 };
  }

  logger.info('Scholarship agent completed');
  return { profileAnalysis, scholarships: scoredScholarships, strategy };
};

export default scholarshipAgent;
