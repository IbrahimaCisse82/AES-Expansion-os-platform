// Static data for AfriDataHub sections, filtered for target countries
// Belgique, Bénin, Burkina Faso, Côte d'Ivoire, Ouganda, Sénégal

export interface DealItem {
  id: string;
  title: string;
  description: string;
  countries: string[];
  date: string;
  status: 'Actif' | 'En cours' | 'Terminé' | 'Planifié' | 'Ouvert' | 'Attribué' | 'En évaluation';
  sector: string;
  amount?: string;
  partner?: string;
  organization?: string;
  type?: string;
  source_url?: string;
  details?: {
    objectives?: string[];
    key_facts?: string[];
    contacts?: string[];
    timeline?: string;
    eligibility?: string;
    documents?: string[];
  };
}

export const AGREEMENTS: DealItem[] = [
  {
    id: 'acc-1',
    title: 'Zone de Libre-Échange Continentale Africaine (ZLECAf)',
    description: 'Plus grande zone de libre-échange au monde par nombre de pays. 54 signataires, 48 ratifications. Objectif : marché unique continental de 1.3 milliard de personnes.',
    countries: ['Burkina Faso', 'Bénin', 'Côte d\'Ivoire', 'Sénégal', 'Ouganda'],
    date: '2018-03-21',
    status: 'Actif',
    sector: 'Commerce',
    amount: '3 400 milliards USD (PIB combiné)',
    partner: 'Union Africaine',
    source_url: 'https://au-afcfta.org/',
    details: {
      objectives: [
        'Créer un marché unique pour les biens et services',
        'Faciliter la libre circulation des personnes et des investissements',
        'Éliminer 90% des tarifs douaniers entre pays membres',
        'Booster le commerce intra-africain de 52% d\'ici 2025',
      ],
      key_facts: [
        '54 pays signataires sur 55 membres de l\'UA',
        'PIB combiné de 3 400 milliards USD',
        '1.3 milliard de consommateurs potentiels',
        'Entrée en vigueur : 30 mai 2019',
        'Phase 2 couvre investissements et concurrence',
      ],
      timeline: 'Phase 1 (2021-2024) : Libéralisation tarifaire. Phase 2 (2025-2030) : Investissements, concurrence, propriété intellectuelle.',
    },
  },
  {
    id: 'acc-2',
    title: 'Accords de Partenariat Économique UE – Afrique de l\'Ouest (APE)',
    description: 'Accord de partenariat économique régional entre l\'UE et les pays d\'Afrique de l\'Ouest. Accès préférentiel au marché européen pour les exportations.',
    countries: ['Burkina Faso', 'Bénin', 'Côte d\'Ivoire', 'Sénégal'],
    date: '2024-06-30',
    status: 'En cours',
    sector: 'Commerce',
    amount: 'Réductions tarifaires progressives',
    partner: 'Union Européenne',
    source_url: 'https://ec.europa.eu/trade/policy/countries-and-regions/regions/west-africa/',
    details: {
      objectives: [
        'Accès au marché européen sans droits de douane ni quotas',
        'Accompagnement financier pour renforcer les capacités productives',
        'Protection des industries naissantes africaines',
        'Harmonisation des normes commerciales',
      ],
      key_facts: [
        'La Côte d\'Ivoire applique un APE intérimaire depuis 2019',
        'Le Ghana a signé un APE intérimaire en 2016',
        'Fonds d\'accompagnement UE de 6.5 milliards EUR',
        'Période de transition de 20 ans pour la libéralisation complète',
      ],
      eligibility: 'Entreprises exportatrices des 16 pays d\'Afrique de l\'Ouest vers l\'UE',
    },
  },
  {
    id: 'acc-3',
    title: 'Forum sur la Coopération sino-africaine (FOCAC) – Plan d\'action 2025-2027',
    description: 'Plan d\'action triennal adopté au sommet de Pékin. 10 actions de partenariat couvrant industrialisation, agriculture, commerce et développement vert.',
    countries: ['Burkina Faso', 'Côte d\'Ivoire', 'Sénégal', 'Ouganda'],
    date: '2024-09-06',
    status: 'Actif',
    sector: 'Commerce',
    amount: '50.7 milliards USD',
    partner: 'Chine',
    source_url: 'https://www.focac.org/',
    details: {
      objectives: [
        'Modernisation de l\'agriculture et sécurité alimentaire',
        'Industrialisation et transfert de technologie',
        'Infrastructure verte et transition énergétique',
        'Formation de 500 000 professionnels africains',
      ],
      key_facts: [
        'Sommet de Pékin, septembre 2024',
        '50.7 milliards USD d\'engagements financiers',
        '30 milliards de lignes de crédit',
        '10 milliards d\'investissements directs',
        'Exportations zero-tarif pour les PMA africains',
      ],
      timeline: '2025-2027 : Mise en œuvre des 10 actions de partenariat',
    },
  },
  {
    id: 'acc-4',
    title: 'Accord-cadre TICAD 9 Afrique – Japon',
    description: 'Engagements de la 9e conférence TICAD à Yokohama. Investissements en infrastructure de qualité, santé, éducation et technologies numériques.',
    countries: ['Côte d\'Ivoire', 'Sénégal', 'Ouganda'],
    date: '2025-08-21',
    status: 'Actif',
    sector: 'Infrastructure',
    amount: '30 milliards USD',
    partner: 'Japon',
    source_url: 'https://www.mofa.go.jp/region/africa/ticad/',
    details: {
      objectives: [
        'Infrastructure de qualité et développement durable',
        'Transformation numérique et innovation',
        'Santé universelle et lutte contre les pandémies',
        'Paix et stabilité en Afrique',
      ],
      key_facts: [
        '30 milliards USD sur 3 ans',
        'TICAD existe depuis 1993',
        'Focus sur le secteur privé japonais en Afrique',
        'Programme de bourses JICA pour étudiants africains',
      ],
    },
  },
  {
    id: 'acc-5',
    title: 'Partenariat UE-UA Global Gateway pour l\'Afrique',
    description: 'Paquet d\'investissement Global Gateway pour l\'Afrique. Infrastructures numériques, transport, énergie, santé et éducation.',
    countries: ['Burkina Faso', 'Bénin', 'Côte d\'Ivoire', 'Sénégal', 'Ouganda'],
    date: '2023-10-25',
    status: 'Actif',
    sector: 'Infrastructure',
    amount: '150 milliards EUR',
    partner: 'Union Européenne',
    source_url: 'https://commission.europa.eu/strategy-and-policy/priorities-2019-2024/stronger-europe-world/global-gateway_en',
    details: {
      objectives: [
        'Réseaux numériques haut débit (câbles sous-marins, fibre optique)',
        'Corridors de transport durables',
        'Énergie propre et accès universel à l\'électricité',
        'Systèmes de santé résilients',
      ],
      key_facts: [
        '150 milliards EUR mobilisés d\'ici 2027',
        'Alternative européenne à la Belt and Road Initiative',
        'Accent sur les partenariats public-privé',
        '40% des investissements ciblés vers l\'Afrique',
      ],
    },
  },
  {
    id: 'acc-6',
    title: 'Accord Belgique – Afrique de l\'Ouest : Coopération au Développement',
    description: 'Programme de coopération bilatérale entre la Belgique et les pays d\'Afrique de l\'Ouest ciblant agriculture, gouvernance et développement durable.',
    countries: ['Belgique', 'Burkina Faso', 'Bénin', 'Sénégal'],
    date: '2023-01-15',
    status: 'Actif',
    sector: 'Développement',
    amount: '200 millions EUR',
    partner: 'Belgique / Enabel',
    source_url: 'https://www.enabel.be/',
    details: {
      objectives: [
        'Renforcement de la gouvernance locale',
        'Agriculture durable et sécurité alimentaire',
        'Formation professionnelle et emploi des jeunes',
        'Santé et droits sexuels et reproductifs',
      ],
      key_facts: [
        'Enabel est l\'agence belge de développement',
        'Présence dans 20 pays partenaires',
        'Budget annuel de ~350 millions EUR',
        'Focus sur la digitalisation de l\'administration',
      ],
      contacts: ['Enabel Belgique : info@enabel.be', 'DGD (Direction générale Coopération au développement)'],
    },
  },
];

export const PROGRAMS: DealItem[] = [
  {
    id: 'prog-1',
    title: 'Agenda 2063 – L\'Afrique que nous voulons',
    description: 'Cadre stratégique continental pour la transformation socio-économique de l\'Afrique sur 50 ans. 7 aspirations et 14 projets phares.',
    countries: ['Burkina Faso', 'Bénin', 'Côte d\'Ivoire', 'Sénégal', 'Ouganda'],
    date: '2015-01-01',
    status: 'Actif',
    sector: 'Commerce',
    organization: 'Commission de l\'Union Africaine',
    source_url: 'https://au.int/agenda2063',
    details: {
      objectives: [
        'Croissance inclusive et développement durable',
        'Intégration continentale et panafricanisme',
        'Gouvernance démocratique et droits de l\'homme',
        'Paix et sécurité',
      ],
      key_facts: [
        '7 aspirations pour le continent',
        '14 projets phares dont la ZLECAf et le réseau de trains à grande vitesse',
        'Plans décennaux de mise en œuvre (2024-2033 en cours)',
        'Suivi par l\'AUDA-NEPAD',
      ],
    },
  },
  {
    id: 'prog-2',
    title: 'Programme de Développement des Infrastructures en Afrique (PIDA)',
    description: 'Programme continental visant à combler le déficit d\'infrastructure de l\'Afrique dans les transports, énergie, eau et TIC.',
    countries: ['Burkina Faso', 'Côte d\'Ivoire', 'Sénégal', 'Ouganda'],
    date: '2012-01-01',
    status: 'Actif',
    sector: 'Infrastructure',
    amount: '360 milliards USD',
    organization: 'AUDA-NEPAD / BAD',
    source_url: 'https://www.au-pida.org/',
    details: {
      objectives: [
        'Connecter les économies africaines via des corridors de transport',
        'Tripler la production énergétique du continent',
        'Étendre la connectivité numérique à 80% de la population',
        'Assurer l\'accès à l\'eau et à l\'assainissement',
      ],
      key_facts: [
        '69 projets prioritaires identifiés',
        'Investissement estimé : 360 milliards USD d\'ici 2040',
        'Exemples : Pont Kinshasa-Brazzaville, Corridor Dakar-Abidjan',
        'Phase 2 (PAP2) : 2021-2030',
      ],
    },
  },
  {
    id: 'prog-3',
    title: 'Plan Sénégal Émergent (PSE)',
    description: 'Stratégie nationale de développement économique et social du Sénégal. Trois axes : transformation structurelle, capital humain, gouvernance.',
    countries: ['Sénégal'],
    date: '2014-01-01',
    status: 'Actif',
    sector: 'Industrie',
    amount: '12.5 milliards USD (Phase 2)',
    organization: 'Gouvernement du Sénégal',
    source_url: 'https://www.sentresor.org/pse/',
    details: {
      objectives: [
        'Croissance annuelle de 7-8% du PIB',
        'Création de pôles industriels (Diamniadio, Sandiara)',
        'Autosuffisance en riz d\'ici 2025',
        'Tourisme : doubler les arrivées internationales',
      ],
      key_facts: [
        'Lancé en 2014 par le Président Macky Sall',
        'Phase 2 : Plan d\'Actions Prioritaires 2019-2023',
        'Découverte de pétrole et gaz (champ GTA, Sangomar)',
        'Nouveau port de Ndayane en construction',
      ],
    },
  },
  {
    id: 'prog-4',
    title: 'Plan National de Développement Économique et Social (PNDES II) – Burkina Faso',
    description: 'Plan quinquennal de développement du Burkina Faso axé sur résilience, sécurité alimentaire, transformation structurelle et capital humain.',
    countries: ['Burkina Faso'],
    date: '2021-01-01',
    status: 'Actif',
    sector: 'Développement',
    organization: 'Gouvernement du Burkina Faso',
    details: {
      objectives: [
        'Restaurer la sécurité et la résilience des populations',
        'Développer le capital humain',
        'Dynamiser les secteurs porteurs de l\'économie',
        'Renforcer la gouvernance',
      ],
      key_facts: [
        'Budget prévisionnel : 18 400 milliards FCFA',
        'Focus sur la sécurité alimentaire',
        'Programme d\'urgence Sahel',
        'Partenariat avec le G5 Sahel',
      ],
    },
  },
  {
    id: 'prog-5',
    title: 'Vision Uganda 2040',
    description: 'Cadre stratégique national visant à transformer l\'Ouganda en pays à revenu intermédiaire supérieur. Cibles : industrialisation, agriculture, TIC.',
    countries: ['Ouganda'],
    date: '2013-01-01',
    status: 'Actif',
    sector: 'Industrie',
    organization: 'National Planning Authority Uganda',
    source_url: 'http://www.npa.go.ug/',
    details: {
      objectives: [
        'PIB par habitant de 9 500 USD d\'ici 2040',
        'Industrialisation et valeur ajoutée agricole',
        'Développement de l\'infrastructure énergétique',
        'Transformation numérique et innovation',
      ],
      key_facts: [
        'Population : 48 millions (croissance ~3%/an)',
        'PIB actuel : ~50 milliards USD',
        'Ressources pétrolières du lac Albert',
        'Hub technologique est-africain en croissance',
      ],
    },
  },
  {
    id: 'prog-6',
    title: 'Programme d\'Actions du Gouvernement (PAG) – Bénin',
    description: 'Programme d\'investissements prioritaires du Bénin : tourisme, agriculture, numérique, infrastructures de transport et éducation.',
    countries: ['Bénin'],
    date: '2021-01-01',
    status: 'Actif',
    sector: 'Développement',
    amount: '17.2 milliards USD',
    organization: 'Gouvernement du Bénin',
    details: {
      objectives: [
        'Tourisme : valoriser la Route des Esclaves et le patrimoine vaudou',
        'Agriculture : transformation locale du coton, anacarde, ananas',
        'Numérique : couverture fibre optique nationale',
        'Éducation : réforme du système éducatif',
      ],
      key_facts: [
        'PIB en croissance de 6%+ par an',
        'Premier exportateur africain de coton',
        'Zone économique spéciale de Glo-Djigbé (GDIZ)',
        'Partenariat avec la Banque Mondiale et la BAD',
      ],
    },
  },
  {
    id: 'prog-7',
    title: 'Plan National de Développement (PND 2021-2025) – Côte d\'Ivoire',
    description: 'Accélération de la transformation industrielle de la Côte d\'Ivoire. Cibles : agroalimentaire, textiles, numérique, énergie renouvelable.',
    countries: ['Côte d\'Ivoire'],
    date: '2021-01-01',
    status: 'Actif',
    sector: 'Industrie',
    amount: '59 milliards USD',
    organization: 'Gouvernement de Côte d\'Ivoire',
    source_url: 'https://www.pnd.gouv.ci/',
    details: {
      objectives: [
        'Transformer localement 50% du cacao d\'ici 2025',
        'Créer 8 millions d\'emplois',
        'Atteindre 42% de taux d\'industrialisation',
        'Accès universel à l\'électricité',
      ],
      key_facts: [
        '1er producteur mondial de cacao (45% du marché)',
        'Croissance du PIB de 7% en moyenne depuis 2012',
        'Zone industrielle de PK24 et Bonoua',
        'Métro d\'Abidjan en construction (ligne 1)',
      ],
    },
  },
];

export const PROJECTS: DealItem[] = [
  {
    id: 'proj-1',
    title: 'Train Express Régional (TER) Dakar',
    description: 'Ligne ferroviaire de 55 km reliant Dakar à l\'AIBD via Diamniadio. Phase 1 opérationnelle. Capacité : 115 000 passagers/jour.',
    countries: ['Sénégal'],
    date: '2016-12-14',
    status: 'En cours',
    sector: 'Transport',
    amount: '1.2 milliards EUR',
    organization: 'APIX / SETER',
    source_url: 'https://www.seter.sn/',
    details: {
      objectives: [
        'Désengorger Dakar et réduire les temps de trajet de 50%',
        'Connecter le centre-ville à l\'aéroport AIBD',
        'Stimuler le développement de Diamniadio',
      ],
      key_facts: [
        '55 km de voies ferrées',
        '14 gares',
        '115 000 passagers/jour (capacité)',
        'Phase 1 inaugurée en décembre 2021',
        'Financé par : BAD, BID, AFD, France',
      ],
      timeline: 'Phase 1 : Dakar-Diamniadio (36 km) opérationnel. Phase 2 : Diamniadio-AIBD (19 km) en cours.',
    },
  },
  {
    id: 'proj-2',
    title: 'Autoroute Yamoussoukro – Bouaké',
    description: 'Construction de l\'autoroute reliant la capitale politique à la deuxième ville de Côte d\'Ivoire. 196 km, 2x3 voies.',
    countries: ['Côte d\'Ivoire'],
    date: '2023-01-01',
    status: 'En cours',
    sector: 'Transport',
    amount: '1.5 milliards EUR',
    organization: 'Ministère des Infrastructures CI',
    details: {
      objectives: [
        'Relier les deux principales villes du centre',
        'Réduire le temps de trajet de 4h à 1h30',
        'Développer le corridor nord (Burkina Faso)',
      ],
      key_facts: [
        '196 km d\'autoroute 2x3 voies',
        'Fait partie du corridor Abidjan-Ouagadougou',
        'PPP avec des partenaires français et marocains',
        'Livraison prévue : 2027',
      ],
    },
  },
  {
    id: 'proj-3',
    title: 'Barrage hydroélectrique de Karuma – Ouganda',
    description: 'Centrale hydroélectrique de 600 MW sur le Nil. Plus grande infrastructure énergétique d\'Ouganda à ce jour.',
    countries: ['Ouganda'],
    date: '2013-01-01',
    status: 'En cours',
    sector: 'Énergie',
    amount: '1.7 milliards USD',
    organization: 'Uganda Electricity Generation Co.',
    details: {
      objectives: [
        'Augmenter la capacité énergétique nationale de 60%',
        'Réduire le coût de l\'électricité',
        'Alimenter l\'industrialisation ougandaise',
      ],
      key_facts: [
        '600 MW de capacité installée',
        'Située sur le Nil Victoria, district de Kiryandongo',
        'Financé par la China Exim Bank (85%)',
        'Construit par Sinohydro Corporation',
        'Mise en service progressive : 2024-2025',
      ],
    },
  },
  {
    id: 'proj-4',
    title: 'Port sec de Ouagadougou – Zone logistique',
    description: 'Création d\'une plateforme logistique multimodale pour désengorger le corridor Abidjan-Ouagadougou. Terminal de conteneurs et entrepôts.',
    countries: ['Burkina Faso'],
    date: '2022-01-01',
    status: 'Planifié',
    sector: 'Infrastructure',
    amount: '150 millions USD',
    organization: 'Chambre de Commerce BF',
    details: {
      objectives: [
        'Réduire les coûts logistiques de 30%',
        'Créer un hub régional pour le commerce sahélien',
        'Moderniser la chaîne d\'approvisionnement',
      ],
      key_facts: [
        'Superficie prévue : 200 hectares',
        'Terminal à conteneurs de 5 000 EVP/an',
        'Zone franche industrielle associée',
        'Corridor Abidjan-Ouagadougou : 1 200 km',
      ],
    },
  },
  {
    id: 'proj-5',
    title: 'Marina de Cotonou – Port de plaisance',
    description: 'Projet d\'aménagement du front de mer de Cotonou incluant port de plaisance, centre commercial et complexe hôtelier.',
    countries: ['Bénin'],
    date: '2021-01-01',
    status: 'En cours',
    sector: 'Tourisme',
    amount: '300 millions USD',
    organization: 'Gouvernement du Bénin',
    details: {
      objectives: [
        'Faire de Cotonou une destination touristique côtière',
        'Créer 15 000 emplois directs et indirects',
        'Valoriser le patrimoine maritime béninois',
      ],
      key_facts: [
        'Front de mer de 5 km réaménagé',
        'Port de plaisance de 200 places',
        'Hôtels 4 et 5 étoiles',
        'Centre de conférences international',
        'Financement : PPP avec investisseurs privés',
      ],
    },
  },
  {
    id: 'proj-6',
    title: 'Réseau fibre optique national – Sénégal',
    description: 'Déploiement de 3 000 km de fibre optique couvrant les 14 régions du Sénégal. Connectivité haut débit pour administration et secteur privé.',
    countries: ['Sénégal'],
    date: '2020-01-01',
    status: 'En cours',
    sector: 'Numérique',
    amount: '120 millions USD',
    organization: 'ADIE Sénégal',
    source_url: 'https://www.adie.sn/',
    details: {
      objectives: [
        'Couverture fibre optique dans les 14 régions',
        'Connecter 100% des administrations au haut débit',
        'Réduire le coût de la bande passante de 40%',
      ],
      key_facts: [
        '3 000 km de fibre optique terrestre',
        'Câbles sous-marins ACE et SHARE',
        'Data center Tier III à Diamniadio',
        'Partenariat Huawei et China Telecom',
      ],
    },
  },
];

export const FUNDERS: DealItem[] = [
  {
    id: 'fund-1',
    title: 'Banque Africaine de Développement (BAD)',
    description: 'Principale institution de financement du développement en Afrique. Finance des projets d\'infrastructure, d\'énergie et de développement humain.',
    countries: ['Côte d\'Ivoire', 'Burkina Faso', 'Sénégal', 'Bénin', 'Ouganda'],
    date: '',
    status: 'Actif',
    sector: 'Infrastructure',
    amount: '12.6 milliards USD/an',
    type: 'Banque',
    source_url: 'https://www.afdb.org/',
    details: {
      objectives: [
        'High 5 : Éclairer l\'Afrique, Nourrir l\'Afrique, Industrialiser l\'Afrique, Intégrer l\'Afrique, Améliorer la qualité de vie',
      ],
      key_facts: [
        'Siège : Abidjan, Côte d\'Ivoire',
        '81 pays actionnaires',
        'Notation AAA par les principales agences',
        'Guichet FAD pour les pays à faible revenu',
      ],
      contacts: ['Site web : www.afdb.org', 'Contact Abidjan : +225 20 26 39 00'],
    },
  },
  {
    id: 'fund-2',
    title: 'Banque Mondiale (IDA/BIRD)',
    description: 'Plus grand bailleur multilatéral pour l\'Afrique via l\'IDA (pays à faible revenu) et la BIRD. Prêts concessionnels, dons et assistance technique.',
    countries: ['Burkina Faso', 'Bénin', 'Côte d\'Ivoire', 'Sénégal', 'Ouganda'],
    date: '',
    status: 'Actif',
    sector: 'Multisectoriel',
    amount: '30 milliards USD/an (Afrique)',
    type: 'Banque',
    source_url: 'https://www.worldbank.org/en/region/afr',
    details: {
      key_facts: [
        'IDA21 : reconstitution record de 93 milliards USD',
        'Présence dans tous les pays cibles',
        'Priorités : climat, capital humain, numérique',
        'Programme IFC pour le secteur privé',
      ],
    },
  },
  {
    id: 'fund-3',
    title: 'Agence Française de Développement (AFD)',
    description: 'Finance et accompagne des projets de développement en Afrique de l\'Ouest. Expertise en climat, éducation, gouvernance et urbanisation.',
    countries: ['Burkina Faso', 'Bénin', 'Côte d\'Ivoire', 'Sénégal'],
    date: '',
    status: 'Actif',
    sector: 'Développement',
    amount: '6.3 milliards EUR/an (Afrique)',
    type: 'Agence',
    source_url: 'https://www.afd.fr/',
    details: {
      key_facts: [
        'Présence dans 150 pays',
        'Filiale Proparco pour le secteur privé',
        'Focus : ODD, Accord de Paris',
        '50% des financements pour le climat',
      ],
    },
  },
  {
    id: 'fund-4',
    title: 'Enabel – Coopération belge',
    description: 'Agence belge de développement. Programmes actifs en Afrique de l\'Ouest : santé, agriculture, formation professionnelle et numérique.',
    countries: ['Belgique', 'Burkina Faso', 'Bénin', 'Sénégal', 'Ouganda'],
    date: '',
    status: 'Actif',
    sector: 'Développement',
    amount: '350 millions EUR/an',
    type: 'Agence',
    source_url: 'https://www.enabel.be/',
    details: {
      key_facts: [
        'Agence belge de développement depuis 2018',
        '2 000 collaborateurs dans 20 pays',
        'Focus : digitalisation, agriculture, formation',
        'Budget annuel ~350 millions EUR',
      ],
      contacts: ['Enabel Belgique : info@enabel.be'],
    },
  },
  {
    id: 'fund-5',
    title: 'BOAD – Banque Ouest-Africaine de Développement',
    description: 'Institution financière commune aux pays de l\'UEMOA. Finance infrastructures, agriculture, industrie et énergie en Afrique de l\'Ouest.',
    countries: ['Burkina Faso', 'Bénin', 'Côte d\'Ivoire', 'Sénégal'],
    date: '',
    status: 'Actif',
    sector: 'Infrastructure',
    amount: '1.5 milliards USD/an',
    type: 'Banque',
    source_url: 'https://www.boad.org/',
    details: {
      key_facts: [
        'Siège : Lomé, Togo',
        'Institution de l\'UEMOA (8 pays)',
        'Notation BBB par Standard & Poor\'s',
        'Financement de projets PPP régionaux',
      ],
    },
  },
  {
    id: 'fund-6',
    title: 'BIO – Belgian Investment Company for Developing Countries',
    description: 'Société belge d\'investissement pour les pays en développement. Capital risque, prêts et garanties pour PME et startups africaines.',
    countries: ['Belgique', 'Burkina Faso', 'Côte d\'Ivoire', 'Sénégal', 'Ouganda'],
    date: '',
    status: 'Actif',
    sector: 'Finance',
    amount: '450 millions EUR (portefeuille)',
    type: 'Fonds',
    source_url: 'https://www.bio-invest.be/',
    details: {
      key_facts: [
        'Portefeuille de 450 millions EUR',
        'Investissements en capital et prêts',
        'Focus : énergie renouvelable, agri-business, fintech',
        'Filiale de la DGD belge',
      ],
    },
  },
];

export const TENDERS: DealItem[] = [
  {
    id: 'tender-1',
    title: 'Appel d\'offres – Extension réseau électrique rural Burkina Faso',
    description: 'Fourniture et installation de systèmes solaires hors réseau pour 500 villages. Programme d\'électrification rurale phase 3.',
    countries: ['Burkina Faso'],
    date: '2025-06-30',
    status: 'Ouvert',
    sector: 'Énergie',
    amount: '85 millions USD',
    organization: 'SONABEL',
    details: {
      objectives: [
        'Électrifier 500 villages ruraux',
        'Installer 50 000 systèmes solaires domestiques',
        'Former 200 techniciens locaux',
      ],
      eligibility: 'Entreprises certifiées en énergie solaire avec expérience en Afrique sub-saharienne. Consortium international/local recommandé.',
      timeline: 'Date limite de soumission : 30 juin 2025. Évaluation : juillet-août 2025. Attribution : septembre 2025.',
      documents: ['Cahier des charges disponible sur le site SONABEL', 'Dossier technique obligatoire'],
    },
  },
  {
    id: 'tender-2',
    title: 'Construction du nouvel aéroport de San Pedro – Côte d\'Ivoire',
    description: 'Conception et construction d\'un aéroport international dans la deuxième zone industrielle de Côte d\'Ivoire.',
    countries: ['Côte d\'Ivoire'],
    date: '2025-08-15',
    status: 'Ouvert',
    sector: 'Transport',
    amount: '320 millions USD',
    organization: 'ANAC CI',
    details: {
      objectives: [
        'Aéroport international catégorie 4E OACI',
        'Piste de 3 000 m',
        'Terminal passagers de 50 000 m²',
        'Zone de fret de 10 000 m²',
      ],
      eligibility: 'Entreprises de BTP avec expérience aéroportuaire. Lot unique ou lots séparés.',
      timeline: 'Date limite : 15 août 2025. Construction : 2026-2029.',
    },
  },
  {
    id: 'tender-3',
    title: 'Fourniture d\'équipements médicaux – CHU de Dakar',
    description: 'Acquisition d\'équipements hospitaliers modernes pour la rénovation du Centre Hospitalier Universitaire de Dakar.',
    countries: ['Sénégal'],
    date: '2025-05-30',
    status: 'En évaluation',
    sector: 'Santé',
    amount: '45 millions USD',
    organization: 'Ministère de la Santé SN',
    details: {
      objectives: [
        'Moderniser le plateau technique du CHU',
        'Acquérir 200 équipements (IRM, scanners, échographes)',
        'Former le personnel médical',
      ],
      eligibility: 'Fabricants et distributeurs d\'équipements médicaux agréés OMS. Certification CE ou FDA requise.',
    },
  },
  {
    id: 'tender-4',
    title: 'Construction du marché international de Parakou – Bénin',
    description: 'Édification d\'un marché moderne de 25 000 m² avec zones de stockage froid et infrastructures logistiques.',
    countries: ['Bénin'],
    date: '2025-07-15',
    status: 'Ouvert',
    sector: 'Commerce',
    amount: '60 millions USD',
    organization: 'Mairie de Parakou',
    details: {
      objectives: [
        'Construire un marché moderne de 25 000 m²',
        'Créer des zones de stockage frigorifique',
        'Aménager des espaces de vente et restaurants',
      ],
      key_facts: [
        'Parakou : hub commercial du nord du Bénin',
        'Carrefour du corridor Cotonou-Niamey',
        '3 000 commerçants attendus',
      ],
    },
  },
  {
    id: 'tender-5',
    title: 'Modernisation du port de Kampala – Ouganda',
    description: 'Expansion et modernisation du port intérieur de Kampala sur le lac Victoria. Terminal à conteneurs et zone franche.',
    countries: ['Ouganda'],
    date: '2025-09-01',
    status: 'Planifié',
    sector: 'Infrastructure',
    amount: '200 millions USD',
    organization: 'Uganda National Roads Authority',
    details: {
      objectives: [
        'Doubler la capacité du port à conteneurs',
        'Créer une zone franche industrielle',
        'Connecter le port au réseau ferroviaire SGR',
      ],
      key_facts: [
        'Lac Victoria : plus grand lac d\'Afrique',
        'Commerce lacustre : Ouganda, Kenya, Tanzanie',
        'Volume actuel : 200 000 tonnes/an',
      ],
      timeline: 'Études de faisabilité : Q3 2025. Appel d\'offres : Q1 2026. Construction : 2026-2029.',
    },
  },
];

export const STAKEHOLDERS: DealItem[] = [
  {
    id: 'stake-1',
    title: 'Ministère de l\'Économie et des Finances – Burkina Faso',
    description: 'Pilote la politique économique et budgétaire nationale. Coordonne les programmes de développement et les investissements publics.',
    countries: ['Burkina Faso'],
    date: '',
    status: 'Actif',
    sector: 'Gouvernance',
    type: 'Gouvernement',
    details: {
      key_facts: [
        'Tutelle des marchés publics (DGCMEF)',
        'Gestion du budget de l\'État',
        'Coordination avec les partenaires techniques et financiers',
      ],
      contacts: ['Direction Générale de la Coopération : dgcoop@finances.gov.bf'],
    },
  },
  {
    id: 'stake-2',
    title: 'CEPICI – Centre de Promotion des Investissements en Côte d\'Ivoire',
    description: 'Guichet unique pour les investisseurs en Côte d\'Ivoire. Facilitation administrative, incitations fiscales et accompagnement.',
    countries: ['Côte d\'Ivoire'],
    date: '',
    status: 'Actif',
    sector: 'Investissement',
    type: 'Agence publique',
    source_url: 'https://www.cepici.gouv.ci/',
    details: {
      key_facts: [
        'Guichet unique : création d\'entreprise en 24h',
        'Incitations fiscales : exonérations sur 5-15 ans',
        'Code des investissements 2018',
        'Zones économiques spéciales',
      ],
      contacts: ['Tél : +225 20 31 14 00', 'info@cepici.ci'],
    },
  },
  {
    id: 'stake-3',
    title: 'APIX – Agence de Promotion des Investissements – Sénégal',
    description: 'Organisme de promotion et facilitation des investissements au Sénégal. Gestion des zones économiques spéciales.',
    countries: ['Sénégal'],
    date: '',
    status: 'Actif',
    sector: 'Investissement',
    type: 'Agence publique',
    source_url: 'https://investinsenegal.com/',
    details: {
      key_facts: [
        'Guichet unique pour les investisseurs',
        'Zone économique spéciale de Diamniadio',
        'Parc industriel de Sandiara',
        'Code des investissements 2004 (révisé 2021)',
      ],
      contacts: ['contact@apix.sn', 'Tél : +221 33 849 05 55'],
    },
  },
  {
    id: 'stake-4',
    title: 'APIEx – Agence de Promotion des Investissements et des Exportations – Bénin',
    description: 'Promotion de l\'environnement des affaires au Bénin. Appui aux exportateurs et facilitation des IDE.',
    countries: ['Bénin'],
    date: '',
    status: 'Actif',
    sector: 'Investissement',
    type: 'Agence publique',
    details: {
      key_facts: [
        'Guichet unique de création d\'entreprise',
        'Zone industrielle de Glo-Djigbé (GDIZ)',
        'Incitations du Code des investissements 2020',
        'Programme d\'appui aux PME exportatrices',
      ],
    },
  },
  {
    id: 'stake-5',
    title: 'Uganda Investment Authority (UIA)',
    description: 'Autorité d\'investissement de l\'Ouganda. Promotion des IDE, gestion des zones industrielles et free zones.',
    countries: ['Ouganda'],
    date: '',
    status: 'Actif',
    sector: 'Investissement',
    type: 'Agence publique',
    source_url: 'https://www.ugandainvest.go.ug/',
    details: {
      key_facts: [
        'Free zones à Kampala, Entebbe, Jinja',
        'Tax holidays de 10 ans pour les investisseurs',
        'Programme One Stop Centre',
        'Secteurs prioritaires : agro-industrie, tourisme, énergie',
      ],
    },
  },
  {
    id: 'stake-6',
    title: 'Wallonie-Bruxelles International (WBI)',
    description: 'Agence de coopération internationale de la Wallonie et Bruxelles. Programmes de partenariat avec l\'Afrique de l\'Ouest.',
    countries: ['Belgique', 'Burkina Faso', 'Sénégal', 'Bénin'],
    date: '',
    status: 'Actif',
    sector: 'Coopération',
    type: 'Agence publique',
    source_url: 'https://www.wbi.be/',
    details: {
      key_facts: [
        'Bourses d\'études et de recherche',
        'Programmes de mobilité académique',
        'Soutien aux projets culturels et artistiques',
        'Partenariats avec les universités africaines',
      ],
      contacts: ['info@wbi.be', 'Tél : +32 2 421 82 11'],
    },
  },
  {
    id: 'stake-7',
    title: 'UEMOA – Union Économique et Monétaire Ouest-Africaine',
    description: 'Organisation régionale regroupant 8 pays de la zone franc CFA. Harmonisation des politiques économiques et monétaires.',
    countries: ['Burkina Faso', 'Bénin', 'Côte d\'Ivoire', 'Sénégal'],
    date: '',
    status: 'Actif',
    sector: 'Commerce',
    type: 'Organisation régionale',
    source_url: 'https://www.uemoa.int/',
    details: {
      key_facts: [
        '8 pays membres, monnaie commune (Franc CFA)',
        'Tarif Extérieur Commun (TEC)',
        'Marché commun de 130 millions de personnes',
        'BCEAO : banque centrale commune',
        'Convergence macroéconomique obligatoire',
      ],
    },
  },
];

export const ALL_SECTORS = [
  'Commerce', 'Infrastructure', 'Énergie', 'Développement', 'Industrie', 'Transport',
  'Numérique', 'Tourisme', 'Santé', 'Finance', 'Agriculture', 'Investissement',
  'Gouvernance', 'Coopération', 'Multisectoriel',
];

export const TARGET_COUNTRIES = ['Belgique', 'Bénin', 'Burkina Faso', 'Côte d\'Ivoire', 'Ouganda', 'Sénégal'];
