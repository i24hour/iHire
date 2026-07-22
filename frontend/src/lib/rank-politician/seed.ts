export interface PoliticianSeed {
    name: string;
    slug: string;
    party: string;
    state?: string;
    portfolio: string;
    portfolioTopics: string[];
    xHandle: string;
}

function handleUrl(handle: string): string {
    return `https://x.com/${handle.replace(/^@/, '')}`;
}

export const POLITICIAN_SEEDS: PoliticianSeed[] = [
    {
        name: 'Narendra Modi',
        slug: 'narendra-modi',
        party: 'BJP',
        state: 'India',
        // PM role is ignored for scoring — only these allocated departments count.
        portfolio: 'Personnel / Atomic Energy / Space',
        portfolioTopics: [
            'personnel', 'public grievances', 'pensions', 'administrative reforms',
            'department of personnel', 'dopt', 'lokpal', 'cvc',
            'atomic energy', 'nuclear energy', 'nuclear power', 'dae',
            'space programme', 'space program', 'space mission', 'space research',
            'indian space', 'isro', 'department of space', 'satellite launch',
            'satellite', 'gslv', 'pslv',
            'परमाणु', 'अंतरिक्ष', 'कार्मिक', 'पेंशन',
        ],
        xHandle: 'narendramodi',
    },
    {
        name: 'Amit Shah',
        slug: 'amit-shah',
        party: 'BJP',
        portfolio: 'Home Affairs / Cooperation',
        portfolioTopics: [
            'home affairs', 'internal security', 'police', 'border', 'naxal',
            'terrorism', 'citizenship', 'law and order', 'suraksha', 'gribh',
            'cooperation', 'cooperative', 'sahkar', 'सहकारिता',
        ],
        xHandle: 'AmitShah',
    },
    {
        name: 'Nirmala Sitharaman',
        slug: 'nirmala-sitharaman',
        party: 'BJP',
        portfolio: 'Finance',
        portfolioTopics: [
            'finance', 'budget', 'tax', 'gst', 'economy', 'fiscal', 'inflation',
            'banking', 'investment', 'revenue', 'vitta', 'arthvyavastha',
        ],
        xHandle: 'nsitharaman',
    },
    {
        name: 'Rajnath Singh',
        slug: 'rajnath-singh',
        party: 'BJP',
        portfolio: 'Defence',
        portfolioTopics: [
            'defence', 'defense', 'armed forces', 'army', 'navy', 'air force',
            'military', 'indigenous', 'weapon', 'border security', 'raksha',
        ],
        xHandle: 'rajnathsingh',
    },
    {
        name: 'S. Jaishankar',
        slug: 's-jaishankar',
        party: 'BJP',
        portfolio: 'External Affairs',
        portfolioTopics: [
            'external affairs', 'foreign policy', 'diplomacy', 'bilateral',
            'united nations', 'g20', 'embassy', 'visa', 'diaspora', 'videsh',
        ],
        xHandle: 'DrSJaishankar',
    },
    {
        name: 'Nitin Gadkari',
        slug: 'nitin-gadkari',
        party: 'BJP',
        portfolio: 'Road Transport & Highways',
        portfolioTopics: [
            'highway', 'road', 'transport', 'infrastructure', 'expressway',
            'bridge', 'nhai', 'ev', 'biofuel', 'sarak', 'parivahan',
        ],
        xHandle: 'nitin_gadkari',
    },
    {
        name: 'Piyush Goyal',
        slug: 'piyush-goyal',
        party: 'BJP',
        portfolio: 'Commerce & Industry',
        portfolioTopics: [
            'commerce', 'industry', 'export', 'trade', 'manufacturing',
            'startup', 'fdi', 'msme', 'make in india', 'udyog',
        ],
        xHandle: 'PiyushGoyal',
    },
    {
        name: 'Ashwini Vaishnaw',
        slug: 'ashwini-vaishnaw',
        party: 'BJP',
        portfolio: 'Railways / Electronics & IT / Information & Broadcasting',
        portfolioTopics: [
            'railway', 'rail', 'vande bharat', 'station', 'it', 'telecom',
            '5g', 'digital india', 'semiconductor', 'railways', 'sanchar',
            'electronics', 'information technology', 'broadcasting', 'media',
            'information and broadcasting',
        ],
        xHandle: 'AshwiniVaishnaw',
    },
    {
        name: 'J. P. Nadda',
        slug: 'jp-nadda',
        party: 'BJP',
        portfolio: 'Health & Family Welfare',
        portfolioTopics: [
            'health', 'hospital', 'ayushman', 'vaccine', 'medical', 'pharma',
            'public health', 'family welfare', 'swasthya', 'chikitsa',
        ],
        xHandle: 'JPNadda',
    },
    {
        name: 'Dharmendra Pradhan',
        slug: 'dharmendra-pradhan',
        party: 'BJP',
        portfolio: 'Education',
        portfolioTopics: [
            'education', 'school', 'university', 'nep', 'student', 'skill',
            'scholarship', 'teacher', 'shiksha', 'vidyalaya',
        ],
        xHandle: 'dpradhanbjp',
    },
    {
        name: 'Bhupender Yadav',
        slug: 'bhupender-yadav',
        party: 'BJP',
        portfolio: 'Environment / Forest / Climate',
        portfolioTopics: [
            'environment', 'forest', 'climate', 'pollution', 'wildlife',
            'renewable', 'green', 'conservation', 'paryavaran',
        ],
        xHandle: 'byadavbjp',
    },
    {
        name: 'Hardeep Singh Puri',
        slug: 'hardeep-singh-puri',
        party: 'BJP',
        portfolio: 'Petroleum & Natural Gas / Housing',
        portfolioTopics: [
            'petroleum', 'oil', 'gas', 'fuel', 'housing', 'pmay', 'urban',
            'energy', 'lpg', 'awas',
        ],
        xHandle: 'HardeepSPuri',
    },
    {
        name: 'Mansukh Mandaviya',
        slug: 'mansukh-mandaviya',
        party: 'BJP',
        portfolio: 'Labour & Employment',
        portfolioTopics: [
            'labour', 'labor', 'employment', 'jobs', 'worker', 'epfo',
            'skill', 'rojgar', 'shram',
        ],
        xHandle: 'mansukhmandviya',
    },
    {
        name: 'Anurag Thakur',
        slug: 'anurag-thakur',
        party: 'BJP',
        portfolio: 'Information & Broadcasting / Youth Affairs & Sports',
        portfolioTopics: [
            'broadcasting', 'media', 'sports', 'youth', 'olympics',
            'information', 'film', 'khel', 'yuvak',
        ],
        xHandle: 'ianuragthakur',
    },
    {
        name: 'Smriti Irani',
        slug: 'smriti-irani',
        party: 'BJP',
        portfolio: 'Women & Child Development (former / party leadership)',
        portfolioTopics: [
            'women', 'child', 'nutrition', 'beti', 'empowerment',
            'welfare', 'mahila', 'bal',
        ],
        xHandle: 'smritiirani',
    },
    {
        name: 'Jyotiraditya Scindia',
        slug: 'jyotiraditya-scindia',
        party: 'BJP',
        portfolio: 'Civil Aviation / Steel',
        portfolioTopics: [
            'aviation', 'airport', 'airline', 'steel', 'flight',
            'civil aviation', 'udaan',
        ],
        xHandle: 'JM_Scindia',
    },
    {
        name: 'Gajendra Singh Shekhawat',
        slug: 'gajendra-singh-shekhawat',
        party: 'BJP',
        portfolio: 'Jal Shakti / Tourism',
        portfolioTopics: [
            'water', 'jal', 'irrigation', 'tourism', 'drinking water',
            'river', 'sanitation', 'swachh',
        ],
        xHandle: 'gssjodhpur',
    },
    {
        name: 'Kiren Rijiju',
        slug: 'kiren-rijiju',
        party: 'BJP',
        portfolio: 'Parliamentary Affairs / Minority Affairs',
        portfolioTopics: [
            'parliament', 'minority', 'wajf', 'haj', 'legislative',
            'parliamentary affairs',
        ],
        xHandle: 'KirenRijiju',
    },
    {
        name: 'Sarbananda Sonowal',
        slug: 'sarbananda-sonowal',
        party: 'BJP',
        portfolio: 'Ports / Shipping / AYUSH',
        portfolioTopics: [
            'port', 'shipping', 'ayush', 'maritime', 'waterways',
            'coastal', 'yoga', 'ayurveda',
        ],
        xHandle: 'sonowal_s',
    },
    {
        name: 'Ravi Shankar Prasad',
        slug: 'ravi-shankar-prasad',
        party: 'BJP',
        portfolio: 'Party / Legal Affairs (senior leader)',
        portfolioTopics: [
            'law', 'justice', 'legal', 'constitution', 'court', 'nyaya',
        ],
        xHandle: 'rsprasad',
    },
    {
        name: 'Rahul Gandhi',
        slug: 'rahul-gandhi',
        party: 'INC',
        portfolio: 'Leader of Opposition / Party Leadership',
        portfolioTopics: [
            'opposition', 'parliament', 'unemployment', 'farmer', 'youth',
            'democracy', 'constitution', 'inflation', 'education', 'jobs',
        ],
        xHandle: 'RahulGandhi',
    },
    {
        name: 'Mallikarjun Kharge',
        slug: 'mallikarjun-kharge',
        party: 'INC',
        portfolio: 'Congress President / Party Leadership',
        portfolioTopics: [
            'congress', 'opposition', 'parliament', 'democracy',
            'constitution', 'farmer', 'worker', 'social justice',
        ],
        xHandle: 'kharge',
    },
    {
        name: 'Shashi Tharoor',
        slug: 'shashi-tharoor',
        party: 'INC',
        state: 'Kerala',
        portfolio: 'MP / Foreign Policy & Public Affairs',
        portfolioTopics: [
            'parliament', 'foreign policy', 'diplomacy', 'constitution',
            'kerala', 'development', 'education', 'culture',
        ],
        xHandle: 'ShashiTharoor',
    },
    {
        name: 'Sachin Pilot',
        slug: 'sachin-pilot',
        party: 'INC',
        state: 'Rajasthan',
        portfolio: 'State Leadership / Public Policy',
        portfolioTopics: [
            'rajasthan', 'development', 'youth', 'employment',
            'agriculture', 'governance',
        ],
        xHandle: 'SachinPilot',
    },
    {
        name: 'Arvind Kejriwal',
        slug: 'arvind-kejriwal',
        party: 'AAP',
        state: 'Delhi',
        portfolio: 'National Convenor / Governance & Services',
        portfolioTopics: [
            'delhi', 'education', 'health', 'electricity', 'water',
            'mohalla', 'school', 'hospital', 'governance',
        ],
        xHandle: 'ArvindKejriwal',
    },
    {
        name: 'Bhagwant Mann',
        slug: 'bhagwant-mann',
        party: 'AAP',
        state: 'Punjab',
        portfolio: 'Chief Minister, Punjab',
        portfolioTopics: [
            'punjab', 'farmer', 'drugs', 'education', 'health',
            'employment', 'governance', 'cm',
        ],
        xHandle: 'BhagwantMann',
    },
    {
        name: 'Mamata Banerjee',
        slug: 'mamata-banerjee',
        party: 'AITC',
        state: 'West Bengal',
        portfolio: 'Chief Minister, West Bengal',
        portfolioTopics: [
            'bengal', 'west bengal', 'development', 'welfare', 'scheme',
            'education', 'health', 'industry', 'cm',
        ],
        xHandle: 'MamataOfficial',
    },
    {
        name: 'M. K. Stalin',
        slug: 'mk-stalin',
        party: 'DMK',
        state: 'Tamil Nadu',
        portfolio: 'Chief Minister, Tamil Nadu',
        portfolioTopics: [
            'tamil nadu', 'chennai', 'development', 'welfare', 'education',
            'industry', 'health', 'scheme', 'cm',
        ],
        xHandle: 'mkstalin',
    },
    {
        name: 'Yogi Adityanath',
        slug: 'yogi-adityanath',
        party: 'BJP',
        state: 'Uttar Pradesh',
        portfolio: 'Chief Minister, Uttar Pradesh',
        portfolioTopics: [
            'uttar pradesh', 'up', 'law and order', 'development',
            'expressway', 'investment', 'tourism', 'cm', 'suraksha',
        ],
        xHandle: 'myogiadityanath',
    },
    {
        name: 'Eknath Shinde',
        slug: 'eknath-shinde',
        party: 'SHS',
        state: 'Maharashtra',
        portfolio: 'Chief Minister, Maharashtra',
        portfolioTopics: [
            'maharashtra', 'mumbai', 'infrastructure', 'development',
            'metro', 'housing', 'cm',
        ],
        xHandle: 'mieknathshinde',
    },
    {
        name: 'Devendra Fadnavis',
        slug: 'devendra-fadnavis',
        party: 'BJP',
        state: 'Maharashtra',
        portfolio: 'Deputy CM / Home, Maharashtra',
        portfolioTopics: [
            'maharashtra', 'home', 'security', 'infrastructure',
            'development', 'nagpur', 'mumbai',
        ],
        xHandle: 'Dev_Fadnavis',
    },
    {
        name: 'Basavaraj Bommai',
        slug: 'basavaraj-bommai',
        party: 'BJP',
        state: 'Karnataka',
        portfolio: 'Senior Leader / State Politics, Karnataka',
        portfolioTopics: [
            'karnataka', 'bengaluru', 'development', 'agriculture',
            'irrigation', 'governance',
        ],
        xHandle: 'BSBommai',
    },
    {
        name: 'Siddaramaiah',
        slug: 'siddaramaiah',
        party: 'INC',
        state: 'Karnataka',
        portfolio: 'Chief Minister, Karnataka',
        portfolioTopics: [
            'karnataka', 'guarantee', 'welfare', 'scheme', 'agriculture',
            'development', 'cm', 'bengaluru',
        ],
        xHandle: 'siddaramaiah',
    },
    {
        name: 'N. Chandrababu Naidu',
        slug: 'n-chandrababu-naidu',
        party: 'TDP',
        state: 'Andhra Pradesh',
        portfolio: 'Chief Minister, Andhra Pradesh',
        portfolioTopics: [
            'andhra', 'amaravati', 'development', 'technology',
            'infrastructure', 'agriculture', 'cm',
        ],
        xHandle: 'ncbn',
    },
    {
        name: 'Pinarayi Vijayan',
        slug: 'pinarayi-vijayan',
        party: 'CPI(M)',
        state: 'Kerala',
        portfolio: 'Chief Minister, Kerala',
        portfolioTopics: [
            'kerala', 'development', 'welfare', 'health', 'education',
            'disaster', 'governance', 'cm',
        ],
        xHandle: 'pinarayivijayan',
    },
    {
        name: 'Naveen Patnaik',
        slug: 'naveen-patnaik',
        party: 'BJD',
        state: 'Odisha',
        portfolio: 'Former CM / Party Leadership, Odisha',
        portfolioTopics: [
            'odisha', 'development', 'disaster', 'welfare', 'culture',
            'governance',
        ],
        xHandle: 'Naveen_Odisha',
    },
    {
        name: 'Tejashwi Yadav',
        slug: 'tejashwi-yadav',
        party: 'RJD',
        state: 'Bihar',
        portfolio: 'Leader of Opposition, Bihar',
        portfolioTopics: [
            'bihar', 'employment', 'education', 'youth', 'development',
            'opposition', 'jobs',
        ],
        xHandle: 'yadavtejashwi',
    },
    {
        name: 'Akhilesh Yadav',
        slug: 'akhilesh-yadav',
        party: 'SP',
        state: 'Uttar Pradesh',
        portfolio: 'Party Leadership, Uttar Pradesh',
        portfolioTopics: [
            'uttar pradesh', 'up', 'development', 'youth', 'employment',
            'farmer', 'education',
        ],
        xHandle: 'yadavakhilesh',
    },
];

export function toPoliticianDocument(seed: PoliticianSeed) {
    const xHandle = seed.xHandle.replace(/^@/, '');
    return {
        name: seed.name,
        slug: seed.slug,
        party: seed.party,
        state: seed.state,
        portfolio: seed.portfolio,
        portfolioTopics: seed.portfolioTopics.map((t) => t.toLowerCase()),
        xHandle,
        xProfileUrl: handleUrl(xHandle),
        isActive: true,
        lastScrapeStatus: 'never' as const,
        stats: {
            netScore: 0,
            onPortfolioPct: 0,
            postCount: 0,
            scoredPostCount: 0,
            onPortfolioCount: 0,
            relatedCount: 0,
            offTopicCount: 0,
            attackCount: 0,
            personalCount: 0,
            unknownCount: 0,
        },
    };
}
