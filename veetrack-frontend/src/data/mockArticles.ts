import { Article } from '@/types/news';

export const mockArticles: Article[] = [
  {
    id: '1',
    category: 'Technology',
    title: "Silicon Valley's Quantum Leap",
    summary: 'A breakthrough in stabilizing qubits at room temperature has sent shockwaves through the tech sector. Researchers unveiled a prototype that maintains coherence ten times longer than previous iterations, bringing practical quantum computing significantly closer to commercial reality.',
    whatHappened: [
      'Researchers achieved stable room-temperature qubit coherence in a prototype quantum processor.',
      'The prototype leverages a novel diamond crystalline lattice to isolate qubits from thermal vibrations.',
      'Venture capital investment in quantum computing startups has increased by 45% this quarter.'
    ],
    whyItMatters: [
      'Bypasses the absolute-zero refrigeration bottleneck, making commercial quantum computing viable.',
      'Could break standard RSA encryption methods in seconds, requiring urgent security transitions.',
      'Paves the way for massive breakthroughs in artificial intelligence and molecular simulation.'
    ],
    aiActions: [
      'Begin auditing existing cryptographic systems for post-quantum vulnerability.',
      'Track emerging quantum cryptography standards (e.g., NIST lattice-based options).',
      'Evaluate strategic partnerships with quantum computing cloud platforms.'
    ],
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAEX-F00FcVw-KGBrXtEaRWbO4d7Aciv2lEFnVqy_gOzzSxSNBfHfF9zCEx_L0rz2_0jxUwAF0aoBtn8h3S55ALWFmE13fobQj66kzVYCmEI1yQJmUGhBtInOZpqTtxgqO-K4LgCy_WDULacZ4yYB7bcnWeMhAAnU6bI21JprUDXLEBh4L8-875MPCpLUAp4Vd7LBsvMXCfO-QGWP-Ee2L7LwvygAY5M7Ye0j8qkFcw0I8ft8d_UC_r5q9ck4Ue8dY8l3InM_ekJMNT',
    imageAlt: 'Abstract AI and quantum computing concept',
    author: 'Marcus Vance',
    publishedAt: '2 hours ago',
    readingTime: '4 min read',
    source: 'TechCrunch',
    sentiment: 'positive',
    aiNarrative: "Quantum computing is transitioning from pure laboratory experimentation to concrete structural disruption. Through clustering algorithms, we identify a 45% surge in venture capital funding across room-temperature processing startups. Diamond crystalline lattice stabilization represents the key technological breakthrough breaking absolute-zero refrigeration constraints. Standard RSA-2048 encryption systems are now projected to become vulnerable within a collapsed timeline of 3-5 years, requiring immediate security pivots to post-quantum cryptographic standards like lattice-based options.",
    content: `
      <p class="mb-4">In a surprising development that has taken the scientific community by storm, researchers at a Silicon Valley quantum computer prototype lab have achieved what was long considered impossible: stable room-temperature qubit coherence. Under normal conditions, qubits—the fundamental building blocks of quantum computers—require extremely low temperatures (typically close to absolute zero) to prevent environmental noise from collapsing their quantum state.</p>
      <p class="mb-4">The new breakthrough leverages a novel crystalline lattice structure fabricated from synthesized diamonds containing nitrogen-vacancy color centers. This structure isolates the qubits from heat-induced thermal vibrations. According to the team's peer-reviewed publication, the prototype retains quantum coherence for a duration ten times longer than any prior room-temperature attempt.</p>
      <h3 class="text-headline-sm font-semibold text-primary mt-6 mb-3">Re-defining Computing Horizons</h3>
      <p class="mb-4">While full commercial deployment remains several years away, the potential ramifications for cryptographic security, artificial intelligence models, and molecular simulation are astronomical. Standard RSA encryption methods, which secure the vast majority of financial data transactions on the web today, could theoretically be deciphered in seconds by a quantum system operating at this speed.</p>
      <p class="mb-4">"We are looking at a paradigm shift in computing horsepower," commented Dr. Elena Rostova, leading physicist on the project. "It's no longer a question of *if* we can build a consumer-accessible quantum computer, but *when*. The refrigeration bottleneck has finally been broken."</p>
      <p class="mb-4">Tech giants are already pivoting. Venture capital flowing into quantum startups has surged by 45% in the last quarter, signaling that the commercialization timeline has collapsed from decades to a matter of years.</p>
    `
  },
  {
    id: '2',
    category: 'Global',
    title: 'The New Urban Megastructures',
    summary: 'As population density reaches critical mass in major economic hubs, architectural firms are turning to vertical, self-sustaining habitats. These brutalist monoliths aim to house thousands while generating their own power and recycling resources, redefining the skyline.',
    whatHappened: [
      'Architects proposed vertical, closed-loop megastructures to house 15,000 residents per building.',
      'Energy capture is achieved via solar glass facades and wind turbines in ventilation shafts.',
      'Social scientists raised alarms about localized micro-communities and urban alienation.'
    ],
    whyItMatters: [
      'Presents a viable solution to horizontal urban sprawl and habitat destruction.',
      'Proves the concept of completely self-sustaining energy and waste loops on a massive scale.',
      'Could reshape modern sociology and define the future of high-density housing design.'
    ],
    aiActions: [
      'Assess properties in municipal regions transitioning towards vertical high-density zoning.',
      'Investigate green building technologies like solar glass and kinetic wind dynamos.',
      'Integrate micro-community social considerations into urban project planning.'
    ],
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwA1xO3MoeDoPhdDNctCogXAzNXHTEWrAQV4nIFnDHRhLDCENvvMkS6y-tCZVw4oFYoatjpbpncRLc6qrQDjyQBCifJ_kL1Cue3Z0loBK57-TZ01C_BUMFUuuPpOtPBB4LFQ8FMQawuTNNJPYK41WPucetBvmM34yWxxl9UrKoXNN3CgbTeGHX3Cjs7PwhBn6bP7u1iyMbyVYDebphW8kVBHXy09cOeIrlB3WsYv6-KxTROdCMcIVOk3M9LRBDgxZZGAxOzWxRgWiw',
    imageAlt: 'Modern vertical urban monolith architecture structure',
    author: 'Sarah Jenkins',
    publishedAt: '5 hours ago',
    readingTime: '5 min read',
    source: 'Wired',
    sentiment: 'neutral',
    aiNarrative: "Sustainable dense urbanization is clustering under vertical monolith structures, which integrate closed-loop power, water, and food generation. Data clusters indicate a massive reduction of up to 40% in municipal carbon footprints when housing vertical populations versus horizontal suburban sprawl. While engineering solutions like solar-tinted glass and wind channel turbines show high efficacy, sociological neural networks identify immediate micro-community isolation and urban alienation risks. Forward-looking municipal projects must balance eco-structural targets with human spatial comfort factors.",
    content: `
      <p class="mb-4">Modern urban development has reached its physical limits. With cities sprawling horizontally into vital agricultural lands and coastal borders, global planning committees are making a radical pivot. The solution: high-density vertical megastructures—massive self-contained structures colloquially referred to as "brutalist ecosystems."</p>
      <p class="mb-4">Designed by some of the most radical architectural minds of the century, these monoliths are not merely tall apartment blocks. They are engineered to be entirely closed-loop systems. A single structure, stretching over 120 floors high, is designed to house upwards of 15,000 residents while integrating vertical farms, waste treatment facilities, water purification cycles, and localized power generation.</p>
      <h3 class="text-headline-sm font-semibold text-primary mt-6 mb-3">Self-Sustaining Skyward Cities</h3>
      <p class="mb-4">Energy is captured through specialized solar-tinted glass façades that wrap around the building, alongside wind turbines embedded in aerodynamically sculpted ventilation channels. These channels funnel air currents directly into internal power dynamos, generating steady electricity even on calm days.</p>
      <p class="mb-4">Critics, however, raise concerns about the psychological impact of living in these colossal concrete and steel structures. Social researchers point out that the self-contained nature of these buildings could lead to isolated micro-communities, exacerbating urban alienation.</p>
      <p class="mb-4">"We are designing for survival," countered lead architect Kenji Sato. "By containing our footprint vertically, we are allowing nature to reclaim the surrounding land. It is a sacrifice of classic suburban space for the preservation of our biosphere."</p>
    `
  },
  {
    id: '3',
    category: 'Sports',
    title: 'Endurance Redefined',
    summary: 'The limits of human physiology were shattered during the midnight marathon. Utilizing new advancements in metabolic tracking, an unknown runner maintained a sub-four-minute mile pace for the final stretch, completely rewriting the expectations for extreme distance events.',
    whatHappened: [
      'An unknown runner won the Midnight Ultramarathon with a sub-four-minute mile final stretch.',
      'Athletes utilized metabolic tracking patches providing real-time neural network guidance.',
      'Sensors showed the runner maintained stable glycogen consumption and minimal fatigue.'
    ],
    whyItMatters: [
      'Demonstrates the power of combining real-time human bio-telemetry with AI-driven training models.',
      'Re-evaluates the absolute physical limits of human endurance and athletic capability.',
      'Signals a major shift in how sports training, tracking, and execution are structured.'
    ],
    aiActions: [
      'Integrate continuous metabolic tracking devices into professional athletic training regimens.',
      'Develop software interfaces that provide real-time biomechanical feedback to endurance athletes.',
      'Explore broader medical applications of predictive neural networks for glycogen and oxygen regulation.'
    ],
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBSlLeZSu9pay3rFpqi6bdAGCClho7Gt5Fxw3y8sxRvbcAVIa7dGxcZ6SHzi-upGSsa5faM0ClL540pmcfFN6z1JhT0V7spPkDZcPlmO-WHTv1fodmwnc3EJj7_jAWK7axUg_WVCZ4a3y-peZp6INPcFNea3HAIUUP7WC0Ecm6ThMYRwDJppqp3j6sqX0SBISxJhmrKR6brVdxv6q7OFYGIsQdTZoQbicvh1d1iyCaWjuS02KN9JeE88NdswQepNcIxrhM_57jZ1eZV',
    imageAlt: 'Runner blurred in motion in dark background',
    author: 'Jonas Croft',
    publishedAt: 'Yesterday',
    readingTime: '3 min read',
    source: 'ESPN',
    sentiment: 'positive',
    aiNarrative: "Athletic endurance is entering a cybernetic paradigm. By processing continuous bio-telemetry like glycogen, lactic acid, and glucose levels through mobile neural networks, we can deliver real-time pacing adjustments that bypass typical physiological fatigue limits. Current clustering trends show early professional sports adoption, but the algorithms are highly portable. Immediate industrial cross-applications include optimizing safety profiles and cognitive pacing for hazardous emergency responders, military operatives, and high-stress professional workspaces.",
    content: `
      <p class="mb-4">The annual Midnight Ultramarathon has always been a testing ground for extreme human endurance. Yet, no one was prepared for what transpired during the race's final 10 kilometers. An unsponsored, virtually unknown athlete from a remote training academy did not just win the race—he rewrote the laws of sports physiology.</p>
      <p class="mb-4">For over 40 miles, the lead pack had maintained a grueling but standard championship pace. Then, as the clocks struck midnight and rain began to sweep across the tarmac, the athlete broke away. Biosensors attached to the competitors tracked an unprecedented phenomenon: instead of experiencing the typical lactic acid buildup and cardiac fatigue, the runner's metabolic efficiency actually stabilized.</p>
      <h3 class="text-headline-sm font-semibold text-primary mt-6 mb-3">The Sub-Four-Minute Finish</h3>
      <p class="mb-4">Maintaining an incredible sub-four-minute mile pace for the final stretch of a grueling multi-hour race, the runner crossed the finish line in physical condition that doctors described as "highly alert and showing minimal muscular strain."</p>
      <p class="mb-4">Speculation immediately focused on the advanced continuous metabolic monitoring patches worn by the athletes. The patches feed real-time biological telemetry into neural network models, which then instruct runners (via audio cues) exactly when to adjust their posture, breathing cadence, and stride length to optimize glycogen consumption.</p>
      <p class="mb-4">"The runner is now a cybernetic system," explained sports scientist Dr. Arthur Cole. "By marrying muscle memory with micro-second metabolic adjustments, we have unlocked human potentials that were previously considered science fiction."</p>
    `
  },
  {
    id: '4',
    category: 'Culture',
    title: 'The Return of Monoliths',
    summary: 'The latest underground exhibition eschews digital media entirely, returning to imposing, physical textures. Critics are divided on whether this reactionary movement is a profound statement on digital fatigue or merely an exercise in nostalgic aestheticism within the contemporary art world.',
    whatHappened: [
      'A new contemporary art exhibition features massive brutalist concrete and steel sculptures.',
      'The show intentionally excludes all digital displays, projection mappings, and audio guides.',
      'The gallery has recorded record-breaking crowds seeking tactile experiences.'
    ],
    whyItMatters: [
      'Represents a growing cultural backlash and fatigue toward screen-dominated lives.',
      'Re-establishes the importance of physical space and texture in modern art curation.',
      'Shows that consumers are willing to disconnect from digital networks for tactile encounters.'
    ],
    aiActions: [
      'Explore physical design elements to create unique customer touchpoints offline.',
      'Design offline interactive experiences that address digital fatigue as a market opportunity.',
      'Balance digital marketing campaigns with tactile, high-quality physical collateral.'
    ],
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpfO7ZglrSc4z2KUeifymLBgomCTmCwHTLMWDcHtyzhyqBjzm3K9l0ly5prOw6NIPNKHpO0nYGbOp8jaxRxXVmYNRhfeYXIj8AJ1QdP_Sy5hqqVN7bXHrj0EvZ21mOYXdykGkPrcBchGPUWA28RvZpsdoKg1xOh7WFyyi7qHGhrxaCv9Urp4gAti1YsRJr4gZCZpfuxOGVIwGZFO7ypAYG2DIBsY6nU2vzdwWsUSQkJtD9Jo5gpbknS5qjJQ_jHQY09cLlcI9WkvQW',
    imageAlt: 'Brutalist concrete and steel structural sculpture art installation',
    author: 'Elena Hayes',
    publishedAt: '2 days ago',
    readingTime: '6 min read',
    source: 'BBC News',
    sentiment: 'neutral',
    aiNarrative: "Culture trends reveal a profound backlash against hyper-digitization, with consumers actively seeking screen-free tactile environments to counter chronic sensory dilution. Gallery data show record-breaking crowds attending silent, brutalist physical exhibitions featuring concrete and iron monoliths. The market opportunity indicates a strong, high-margin consumer demand for offline experiences. Brand strategies should integrate physical materials and offline tactile touchpoints into product design, positioning digital disconnection as a premium luxury.",
    content: `
      <p class="mb-4">After a decade dominated by virtual reality installations, generative pixel displays, and AI-driven interactive environments, the vanguard of the contemporary art world has made a sudden, defiant retreat into physical materiality. The focal point of this shift is the "Monoliths & Materiality" exhibition currently taking place in the vaults of an abandoned industrial warehouse.</p>
      <p class="mb-4">The exhibition features giant, imposing sculptures made of raw, industrial materials: blocky granite slabs, heavily textured unpolished concrete, rust-encrusted iron pillars, and charred wood. No screens are present. There are no speakers, projection mapping, or interactive digital interfaces. The silence in the cavernous spaces is heavy and intentional.</p>
      <h3 class="text-headline-sm font-semibold text-primary mt-6 mb-3">Re-engaging the Physical Senses</h3>
      <p class="mb-4">"We are suffering from chronic sensory dilution," said curator Clarissa Vance. "Our eyes are adjusted to smooth, glowing screens, and our fingers only touch glass. These monoliths force you to occupy the same physical space as them. You feel their weight, smell the raw concrete, and confront their absolute, unyielding permanence."</p>
      <p class="mb-4">Art critics are deeply divided. Some view this return to brutalist materials as a refreshing, urgent reaction to the hyper-digitization of our lives—an invitation to slow down and reconnect with the physical world. Others dismiss it as retrogressive nostalgia, arguing that art must engage with the digital tools of its era rather than running away from them.</p>
      <p class="mb-4">Regardless of the critical consensus, the exhibition is attracting record-breaking crowds, proving that the desire for tactile, tangible encounters remains a powerful force in modern culture.</p>
    `
  }
];
