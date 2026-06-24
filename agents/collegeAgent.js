import { groqChat } from '../utils/groqClient.js';
import logger from '../utils/logger.js';

const VERIFIED_COLLEGE_URLS = {
  'MIT':                    'https://mit.edu/admissions',
  'Stanford':               'https://admissions.stanford.edu',
  'Harvard':                'https://www.harvard.edu/admissions',
  'Carnegie Mellon':        'https://www.cmu.edu/admission',
  'UC Berkeley':            'https://admissions.berkeley.edu',
  'UCLA':                   'https://admission.ucla.edu',
  'Georgia Tech':           'https://admission.gatech.edu',
  'Purdue':                 'https://www.admissions.purdue.edu',
  'Columbia':               'https://undergrad.admissions.columbia.edu',
  'Cornell':                'https://admissions.cornell.edu',
  'Yale':                   'https://admissions.yale.edu',
  'Princeton':              'https://admission.princeton.edu',
  'NYU':                    'https://www.nyu.edu/admissions',
  'USC':                    'https://admission.usc.edu',
  'Oxford':                 'https://www.ox.ac.uk/admissions/graduate',
  'Cambridge':              'https://www.graduate.study.cam.ac.uk/applying',
  'Imperial College':       'https://www.imperial.ac.uk/study/apply',
  'UCL':                    'https://www.ucl.ac.uk/prospective-students/graduate',
  'Edinburgh':              'https://www.ed.ac.uk/studying/postgraduate/applying',
  'Manchester':             'https://www.manchester.ac.uk/study/postgraduate/applying',
  'University of Toronto':  'https://apply.utoronto.ca',
  'UBC':                    'https://you.ubc.ca/applying-ubc',
  'McGill':                 'https://www.mcgill.ca/applying',
  'Waterloo':               'https://uwaterloo.ca/future-students/apply',
  'University of Melbourne':'https://study.unimelb.edu.au/how-to-apply',
  'ANU':                    'https://www.anu.edu.au/study/apply',
  'UNSW':                   'https://www.unsw.edu.au/study/how-to-apply',
  'Monash':                 'https://www.monash.edu/study/how-to-apply',
  'TU Munich':              'https://www.tum.de/en/studies/applying',
  'RWTH Aachen':            'https://www.rwth-aachen.de/go/id/eisu',
  'NUS':                    'https://www.nus.edu.sg/admissions',
  'NTU':                    'https://www.ntu.edu.sg/admissions',
  'IIT Bombay':             'https://www.iitb.ac.in/admissions',
  'IIT Delhi':              'https://home.iitd.ac.in/admissions.php',
  'IIT Madras':             'https://www.iitm.ac.in/admissions',
  'IISc':                   'https://iisc.ac.in/admissions',
  'IIT Kharagpur':          'https://www.iitkgp.ac.in/admissions',
  'IIT Kanpur':             'https://www.iitk.ac.in/admissions',
  'NIT Trichy':             'https://www.nitt.edu/home/academics/admissions',
  'Anna University':        'https://www.annauniv.edu/admission',
  'VIT':                    'https://vit.ac.in/admissions',
  'SRM':                    'https://www.srmist.edu.in/admissions',
  'Amrita':                 'https://www.amrita.edu/admissions',
  'PSG':                    'https://www.psgtech.edu/admissions',
};

const getCollegeUrl = (name) => {
  const text = name.toLowerCase();
  for (const [key, url] of Object.entries(VERIFIED_COLLEGE_URLS)) {
    if (text.includes(key.toLowerCase())) return url;
  }
  const query = encodeURIComponent(`${name} official admissions apply`);
  return `https://www.google.com/search?q=${query}`;
};

const collegeAgent = async (userProfile) => {
  logger.info('College agent started');

  const targetCountries = userProfile?.targetCountries || [];
  const userState = userProfile?.state || '';
  const isIndia = targetCountries.some((c) => c.toLowerCase().includes('india')) || targetCountries.length === 0;

  // STEP 1 — Eligibility Analysis
  logger.info('Step 1: Analyzing eligibility...');
  const step1 = await groqChat('llama-3.1-8b-instant', [
    {
      role: 'system',
      content: 'You are an expert college admissions counselor. Return ONLY valid JSON, no markdown.',
    },
    {
      role: 'user',
      content: `Analyze this student eligibility:
Profile: ${JSON.stringify(userProfile)}

Return JSON:
{
  "eligibilityScore": 75,
  "strongPoints": ["Strong GPA", "Good test scores"],
  "weakPoints": ["Low GRE score"],
  "recommendedTier": "mid-range",
  "summary": "Brief summary"
}`,
    },
  ]);

  let eligibility;
  try {
    eligibility = JSON.parse(step1.replace(/```json|```/g, '').trim());
  } catch {
    eligibility = { eligibilityScore: 70, strongPoints: [], weakPoints: [], recommendedTier: 'mid-range' };
  }

  // STEP 2 — College Suggestions
  logger.info('Step 2: Finding colleges...');

  const indiaPrompt = `Suggest 10 real colleges in India for this student:
Profile: ${JSON.stringify(userProfile)}
State: ${userState}
Field: ${userProfile?.fieldOfStudy || 'Engineering'}
GPA/CGPA: ${userProfile?.GPA || 'Not specified'}

Categorize as safe (4), match (3), reach (3).
Include IITs, NITs for top students.
For Tamil Nadu: Anna University, VIT, SRM, Amrita, PSG Tech, Kongu, SKCET.

Return JSON array of exactly 10 (DO NOT include URLs):
[
  {
    "name": "IIT Madras",
    "location": "Chennai, Tamil Nadu",
    "country": "India",
    "ranking": "Top 5 in India",
    "program": "MTech Computer Science",
    "category": "reach",
    "minCGPA": "8.5",
    "fees": "Rs. 50,000 per semester",
    "deadline": "2025-03-15",
    "description": "Premier engineering institute",
    "highlights": ["Top ranked", "Research focused"]
  }
]`;

  const internationalPrompt = `Suggest 10 universities for this student:
Profile: ${JSON.stringify(userProfile)}
Target Countries: ${targetCountries.join(', ')}
GPA: ${userProfile?.GPA || 'Not specified'}
Test Scores: ${JSON.stringify(userProfile?.testScores || {})}

Categorize as safe (4), match (3), reach (3) based on student scores.

Return JSON array of exactly 10 (DO NOT include URLs):
[
  {
    "name": "Stanford University",
    "location": "California, USA",
    "country": "USA",
    "ranking": "#2 World",
    "program": "MS Computer Science",
    "category": "reach",
    "minGPA": "3.8",
    "fees": "$60,000 per year",
    "deadline": "2025-12-15",
    "description": "World-leading research university",
    "highlights": ["World top 5", "Silicon Valley"]
  }
]`;

  const step2 = await groqChat('llama-3.3-70b-versatile', [
    {
      role: 'system',
      content: 'You are an expert college admissions counselor. Return ONLY valid JSON arrays, no markdown.',
    },
    {
      role: 'user',
      content: isIndia ? indiaPrompt : internationalPrompt,
    },
  ]);

  let colleges;
  try {
    const cleaned = step2.replace(/```json|```/g, '').trim();
    const match = cleaned.match(/\[[\s\S]*\]/);
    colleges = JSON.parse(match ? match[0] : cleaned);
  } catch {
    colleges = [];
  }

  colleges = colleges.map((c) => ({ ...c, url: getCollegeUrl(c.name) }));

  logger.info('College agent completed');
  return { eligibility, colleges };
};

export default collegeAgent;