export const fr = {
  dashboard: {
    title: "Tableau de bord",
    plan: "Plan actuel",
    trialDays: "jours d'essai restants",
    tryonsMonth: "Essayages ce mois (fair use)",
    activeProducts: "Produits avec try-on actifs",
    remainingQuota: "Essayages restants ce mois",
    upgrade: "Upgrader",
    maxPlan: "Vous etes sur le plan maximal",
    alertQuota: "Limite d'essayages presque atteinte",
    alertPayment: "Paiement en attente",
    alertTrial: "Essai gratuit",
    activity: "Activite des 30 derniers jours",
    choosePlan: "Choisir un plan",
    status: {
      active: "Actif",
      trial: "Essai gratuit",
      pastDue: "En retard",
      canceled: "Annule"
    },
    quotaExceeded: "Limite d'essayages mensuelle atteinte",
    currentPlanLabel: "{used} / {total}",
    productsLabel: "{used} / {total} produits",
    remainingLabel: "{count} essayages restants",
    planCardPrice: "{price} EUR / mois",
    planCardProducts: "{count} produits avec try-on",
    planCardTryons: "jusqu'a {count} essayages / mois",
    planCardFairUse: "Limite fair use — renouvellement mensuel",
    planHighlightBadge: "Le plus populaire",
    planValueProp: "Economisez le cout d'un shooting photo chaque mois",
    currentPlanBadge: "Plan actuel",
    checkoutError: "Impossible de creer la session de paiement",
    checkoutSuccess: "Plan active avec succes !",
    chart: {
      xAxis: "Date",
      yAxis: "Essayages"
    },
    plans: {
      free: "Gratuit",
      starter: "Starter",
      premium: "Premium",
      pro: "Pro",
      ultimate: "Ultimate"
    },
    trialCtaTitle: "Commencez votre essai gratuit de 3 jours",
    trialCtaBody: "Carte bancaire requise — vous ne serez pas preleve avant la fin de l'essai. Annulable a tout moment.",
    trialCtaButton: "Commencer l'essai gratuit",
    noActivePlan: "Aucun plan actif — choisissez un plan ci-dessous pour commencer.",
    addonTitle: "Add-on produits supplementaires",
    addonDescription: "+{products} produits · +{tryons} essayages/mois · {price} EUR/mois",
    addonActiveBadge: "Actif",
    addonAdd: "Ajouter l'add-on",
    addonCheckoutError: "Impossible d'activer l'add-on",
    addonActivatedToast: "Add-on active avec succes !",
    addonManageHint: "Pour annuler l'add-on, utilisez le portail de facturation.",
    boost: {
      title: "Mode Boost",
      description: "Continuez a offrir l'essayage virtuel meme apres votre quota mensuel. Chaque essai supplementaire est facture 0.15€ sur votre facture Shopify.",
      enabled: "Active",
      disabled: "Desactive",
      activate: "Activer le Mode Boost",
      deactivate: "Desactiver le Mode Boost",
      activated: "Mode Boost active !",
      deactivated: "Mode Boost desactive",
      usage: "{count} essais boost ce mois ({cost}€)",
      cappedInfo: "Plafonne a 50€/mois maximum.",
      error: "Erreur lors du changement",
    },
  },
  products: {
    title: "Produits",
    resourceSingular: "produit",
    resourcePlural: "produits",
    deactivate: "Desactiver",
    columnProduct: "Produit",
    columnActivatedAt: "Active le",
    columnStatus: "Statut",
    columnActions: "Actions",
    statusActive: "Actif",
    slotsUsed: "slots produits utilises",
    addonActive: "add-on actif (+2 slots)",
    emptyHeading: "Aucun produit active",
    emptyDescription: "Les produits actives pour l'essayage virtuel apparaitront ici. Ouvrez une fiche produit dans votre boutique pour activer le widget try-on."
  },
  addon: {
    pageTitle: "Add-on produits",
    title: "Add-on produits supplementaires",
    description: "Ajoutez des produits supplementaires et des essayages a votre plan actuel, sans changer de forfait.",
    activeBadge: "Actif",
    inactiveBadge: "Inactif",
    extraProducts: "produits supplementaires",
    extraTryOns: "essayages supplementaires / mois",
    perMonth: "mois",
    activeTitle: "Add-on actif",
    activeBody: "Vos produits et essayages supplementaires sont inclus dans votre quota mensuel.",
    manageButton: "Gerer via le portail de facturation",
    activateButton: "Activer l'add-on",
    requiresPlanTitle: "Plan payant requis",
    requiresPlanBody: "Vous devez etre abonne a un plan payant pour activer l'add-on.",
    checkoutError: "Impossible d'activer l'add-on",
    portalError: "Impossible d'ouvrir le portail de facturation"
  },
  onboarding: {
    title: "Guide d'installation",
    welcome: "Bienvenue sur Infinite Tryon !",
    intro: "Suivez ces 4 etapes pour activer l'essayage virtuel IA sur votre boutique. Temps estime : 10 minutes.",
    helpTitle: "Besoin d'aide ?",
    helpBody: "Contactez-nous a support@infinitetryon.com — on vous repond en moins de 24h.",
    plan: {
      title: "Choisir votre plan",
      description: "Selectionnez un plan adapte a votre catalogue. Vous pouvez commencer par le plan Starter (3 produits) et upgrader a tout moment.",
      instructions: [
        "Allez dans l'onglet Home de l'application",
        "Choisissez un plan (Starter, Premium, Pro ou Ultimate)",
        "Completez le paiement via Shopify",
        "Votre plan est immediatement actif"
      ],
      important: null
    },
    theme: {
      title: "Activer le widget sur votre theme",
      description: "Ajoutez le bloc d'essayage virtuel sur vos pages produit. C'est ce que vos clients verront.",
      instructions: [
        "Allez dans Boutique en ligne > Themes > Personnaliser",
        "Ouvrez une page produit (Product page)",
        "Cliquez sur 'Ajouter un bloc' dans la section produit",
        "Cherchez 'Essayage IA' dans la liste des blocs disponibles",
        "Positionnez le bloc ou vous voulez (sous le bouton Ajouter au panier par exemple)",
        "Cliquez sur Enregistrer"
      ],
      important: "Le bloc doit etre ajoute une seule fois — il s'affichera automatiquement sur toutes les pages produit."
    },
    products: {
      title: "Configurer vos produits",
      description: "Pour chaque produit, renseignez le type de produit dans Shopify. C'est indispensable pour que l'IA sache quel type de vetement essayer.",
      instructions: [
        "Allez dans Produits dans votre admin Shopify",
        "Ouvrez chaque produit concerne",
        "Remplissez le champ 'Type de produit' (ex: T-shirt, Jeans, Robe, Veste, Pantalon...)",
        "Assurez-vous que la photo principale du produit montre bien le vetement seul (flat-lay ou mannequin)",
        "Enregistrez chaque produit"
      ],
      important: "Le type de produit est essentiel ! Sans lui, l'IA ne saura pas si c'est un haut, un bas ou une robe, et le resultat sera de moins bonne qualite."
    },
    test: {
      title: "Tester l'essayage",
      description: "Verifiez que tout fonctionne en testant un essayage sur votre boutique.",
      instructions: [
        "Ouvrez votre boutique (ou le mode preview du theme)",
        "Allez sur une page produit ou le bloc est actif",
        "Uploadez une photo (corps entier, de face, bras le long du corps)",
        "Cliquez sur 'Essayez avec l'IA' et attendez ~20 secondes",
        "Verifiez le rendu — si le resultat n'est pas bon, essayez avec une meilleure photo"
      ],
      important: null
    }
  }
};
