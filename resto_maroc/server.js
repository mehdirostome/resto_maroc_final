// Aller chercher les configurations de l'application
import 'dotenv/config';

// Importer les fichiers et librairies
import express, { json, request, response, urlencoded } from 'express';
import expressHandlebars from 'express-handlebars';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import cspOption from './csp-options.js'
// mes imports
import { getProduit, getProduits } from './model/produit.js';
import { creerPanier, getProduitPanier, getUtilisateurPanier, ajouterProduitCommand, soumettrePanier, getCommandesSoumises, modifierQuantiteProduitPanier, supprimerProduitPanier, supprimerPanier, getCommande, getCommandeSoumise, modifierEtatCommande } from './model/commande.js';
import { getEtatCommandes } from './model/etat_commande.js';
import {iscourrielValid, ismotDePasseValid, validateId, validateQuantite} from './validate.js';
import session from 'express-session';
import memorystore from 'memorystore'
import passport from 'passport';
import './authentification.js'
import { addUtilisateur, getUtilisateurParcourriel } from './model/utilisateur.js';
import https from 'https'
import { readFile } from 'fs/promises';
import middlewareSse from './middleware-sse.js';

// Création du serveur
const app = express();
const handlebars = expressHandlebars.create({});
app.engine('handlebars', expressHandlebars());
app.set('view engine', 'handlebars');
const MemoryStore = memorystore(session);

// Ajout de middlewares
app.use(session({
    cookie:{ maxAge : 3600000},
    name:process.env.npm_package_name,
    store:new MemoryStore({ checkPeriod: 3600000 }),
    resave: false,
    saveUninitialized: false,
    secret: process.env.SESSION_SECRET
}));
app.use(middlewareSse());
app.use(helmet(cspOption));
app.use(compression());
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(express.static('public'));

app.use(passport.initialize());
app.use(passport.session());

// Enregistrement des helpers
handlebars.handlebars.registerHelper('ifeq', function(val1,val2) {
    return val1 === val2;
  })

app.get('/api/produit', async(request, response) => {
    const produits = await getProduits();
    response.json(produits);
});


// get produit
app.get('/api/panier', async(request, response) => {
    // Si utilisateur est pas connecté, on retourne une erreur 401
    if(request.user === undefined){
        response.status(401).json({message: 'Utilisateur non connecté.'});
        return;
    }

    const user = request.user;
    const panier = await getUtilisateurPanier(user.id_utilisateur);
    if(panier === undefined){
        // si le panier n'existe pas, on retourne un tableau vide
        response.status(200).json([]);
        return;
    }
    const result = await getProduitPanier(panier.id_commande);
    // map pour ajouter la quantité
    const produits = result.produits.map(produit => {
        produit.quantite = result.panier_produits.find(panier_produit => panier_produit.id_produit === produit.id_produit).quantite;
        return produit;
    });
    response.json(produits);
});

app.post('/api/panierProduit', async(request, response) => {
    // Si utilisateur est pas connecté, on retourne une erreur 401
    if(request.user === undefined){
        response.status(401).json({message: 'Utilisateur non connecté.'});
        return;
    }
    const user = request.user;
    const {id_produit, quantite} = request.body;
    if(!validateId(id_produit)){
        response.status(400).json({message: 'Identifiant de produit invalide.'});
        return;
    }
    if(!validateQuantite(quantite)){
        response.status(400).json({message: 'Quantité invalide.'});
        return;
    }
    let panier = await getUtilisateurPanier(user.id_utilisateur);
    if(panier === undefined){
        // si le panier n'existe pas on le crée
        panier = await creerPanier(user.id_utilisateur);
        console.log("panier créé");
    }
    let  produit = await getProduit(id_produit);
    if(produit === undefined){
        // si le produit n'existe pas, on retourne une erreur 404
        response.status(404).json({message: 'Produit non trouvé.'});
        return;
    }
    const result = await getProduitPanier(panier.id_commande);
    produit = result.produits.find(produit => produit.id_produit === id_produit);
    if(produit !== undefined){
        // si le produit est déjà dans le panier alors on retourne une erreur 409
        response.status(409).json({message: 'Produit déjà dans le panier.'});
        return;
    }
    await ajouterProduitCommand(panier.id_commande, id_produit, quantite);
    response.status(201).json({message: 'Produit ajouté au panier.'});
});

app.get('/api/soummettrePanier', async(request, response) => {
    // Si utilisateur est pas connecté, on retourne une erreur 401
    if(request.user === undefined){
        response.status(401).json({message: 'Utilisateur non connecté.'});
        return;
    }
    const user = request.user;
    const panier = await getUtilisateurPanier(user.id_utilisateur);
    if(panier === undefined){
        response.status(404).json({message: 'Panier non trouvé.'});
        return;
    }
    //si le panier est vide
    const result = await getProduitPanier(panier.id_commande);
    if(result.produits.length === 0){
        response.status(404).json({message: 'Panier vide.'});
        return;
    }

    if(panier.id_etat_commande !== 1){
        response.status(409).json({message: 'Panier déjà soumis.'});
        return;
    }
    await soumettrePanier(panier.id_commande);
    response.pushJson({
        commande: (await getCommande(panier.id_commande)),
        etatCommande: (await getEtatCommandes()).filter(etatCommande => etatCommande.id_etat_commande !== 1)
    }, 'nouvelleCommande');
    response.status(200).json({message: 'Panier soumis.'});
});


// delete produit du panier
app.delete('/api/panierProduit/', async(request, response) => {
    // Si utilisateur est pas connecté, on retourne une erreur 401
    if(request.user === undefined){
        response.status(401).json({message: 'Utilisateur non connecté.'});
        return;
    }

    const id_produit = request.body.id_produit;
    if(!validateId(id_produit)){
        response.status(400).json({message: 'Identifiant de produit invalide.'});
        return;
    }
    const user = request.user;
    const panier = await getUtilisateurPanier(user.id_utilisateur);
    if(panier === undefined){
        response.status(404).json({message: 'Panier non trouvé.'});
        return;
    }
    const produit = await getProduit(id_produit);
    if(produit === undefined){
        response.status(404).json({message: 'Produit non trouvé.'});
        return;
    }
    const result = await getProduitPanier(panier.id_commande);
    if(result.length === 0){
        response.status(404).json({message: 'Produit non trouvé.'});
        return;
    }
    const panier_produit = result.panier_produits.find(panier_produit => panier_produit.id_produit === id_produit);
    if(panier_produit === undefined){
        response.status(404).json({message: 'Produit non trouvé.'});
        return;
    }
    await supprimerProduitPanier(panier.id_commande, id_produit);
    response.status(200).json({message: 'Produit supprimé du panier.'});
});

// modifier quantité produit du panier
app.patch('/api/panierProduit/:id_produit', async(request, response) => {
    // Si utilisateur est pas connecté, on retourne une erreur 401
    if(request.user === undefined){
        response.status(401).json({message: 'Utilisateur non connecté.'});
        return;
    }
    const id_produit = parseInt(request.params.id_produit);
    const {quantite} = request.body;
    if(!validateId(id_produit)){
        response.status(400).json({message: 'Identifiant de produit invalide.'});
        return;
    }
    if(!validateQuantite(quantite)){
        response.status(400).json({message: 'Quantité invalide.'});
        return;
    }
    
    const user = request.user;
    const panier = await getUtilisateurPanier(user.id_utilisateur);
    // si le panier n'existe pas, on retourne une erreur 404
    if(panier === undefined){
        response.status(404).json({message: 'Panier non trouvé.'});
        return;
    }
    const produit = await getProduit(id_produit);
    // si le produit n'existe pas, on retourne une erreur 404
    if(produit === undefined){
        response.status(404).json({message: 'Produit non trouvé.'});
        return;
    }
    
    const result = await getProduitPanier(panier.id_commande);
    if(result.produits.length === 0){
        response.status(404).json({message: 'Produit non trouvé.'});
        return;
    }
    // si le produit n'est pas dans le panier, on retourne une erreur 404
    const panier_produit = result.panier_produits.find(pp => pp.id_produit === id_produit);
    if(panier_produit === undefined){
        response.status(404).json({message: 'Produit non trouvé.'});
        return;
    }
    await modifierQuantiteProduitPanier(panier.id_commande, id_produit, quantite);
    response.status(200).json({message: 'Quantité du produit modifié.'});
}
);

// delete panier
app.delete('/api/panier', async(request, response) => {
    // Si utilisateur est pas connecté, on retourne une erreur 401
    if(request.user === undefined){
        response.status(401).json({message: 'Utilisateur non connecté.'});
        return;
    }
    const user = request.user;
    const panier = await getUtilisateurPanier(user.id_utilisateur);
    if(panier === undefined){
        response.status(404).json({message: 'Panier non trouvé.'});
        return;
    }
    await supprimerPanier(panier.id_commande);
    response.status(200).json({message: 'Panier supprimé.'});
}
);

// get les commandes soumises
app.get('/api/commandes', async(request, response) => {
    // Si utilisateur est pas connecté, on retourne une erreur 401
    if(request.user === undefined){
        response.status(401).json({message: 'Utilisateur non connecté.'});
        return;
    }
    // Si utilisateur est pas admin, on retourne une erreur 403
    if(request.user.id_type_utilisateur !== 2){
        response.status(403).json({message: 'Utilisateur non autorisé.'});
        return;
    }
    const commandes = await getCommandesSoumises();
    response.json(commandes);
});

// modifier etat commande
app.patch('/api/commandes/:id_commande', async(request, response) => {
    // Si utilisateur est pas connecté, on retourne une erreur 401
    if(request.user === undefined){
        response.status(401).json({message: 'Utilisateur non connecté.'});
        return;
    }
    // Si utilisateur est pas admin, on retourne une erreur 403
    if(request.user.id_type_utilisateur !== 2){
        response.status(403).json({message: 'Utilisateur non autorisé.'});
        return;
    }
    const id_commande = parseInt(request.params.id_commande);
    const {id_etat_commande} = request.body;
    // On retourne une erreur 400 si id_commande n'est pas valide
    if(!validateId(id_commande)){
        response.status(400).json({message: 'Identifiant de commande invalide.'});
        return;
    }
    // On retourne une erreur 400 si id_etat_commande n'est pas valide
    if([2, 3, 4].indexOf(id_etat_commande) === -1){
        response.status(400).json({message: 'Identifiant d\'état de commande invalide.'});
        return;
    }
    const commande = await getCommandeSoumise(id_commande);
    if(commande === undefined){
        response.status(404).json({message: 'Commande non trouvé.'});
        return;
    }
    await modifierEtatCommande(id_commande, id_etat_commande);
    const commandeModifiee =await getCommande(id_commande)
    // envoyer la commande modifiée au client
    response.pushJson({
        commande: commandeModifiee,
        etatCommande: (await getEtatCommandes()).find(etatCommande => etatCommande.id_etat_commande === commandeModifiee.id_etat_commande)
    }, 'commandeModifiee');
    response.status(200).json({message: 'État de la commande modifié.'});
}
);

// get etat_commande
app.get('/api/etatcommandes', async(request, response) => {
    // Si utilisateur est pas connecté, on retourne une erreur 401
    if(request.user === undefined){
        response.status(401).json({message: 'Utilisateur non connecté.'});
        return;
    }
    // Si utilisateur est pas admin, on retourne une erreur 403
    if(request.user.id_type_utilisateur !== 2){
        response.status(403).json({message: 'Utilisateur non autorisé.'});
        return;
    }
    const etat_commandes = await getEtatCommandes();
    response.json(etat_commandes);
});


app.post('/api/inscription', async(request,response,next) => {
    if(iscourrielValid(request.body.courriel) &&
        ismotDePasseValid(request.body.motDePasse)){
        try{
            if(await getUtilisateurParcourriel(request.body.courriel) !== undefined){
                response.status(409).end();
                return;
            }
            await addUtilisateur(request.body.courriel,request.body.motDePasse)
            response.status(201).end();
        }
        catch(erreur){
            if(erreur.code === 'SQLITE_CONTRAINT'){
                response.status(409).end();
            }
            else{
                response.status(409).end()
            }
        }
    }
    else {
        response.sendStatus(400);
    }
});


app.post('/api/connexion', (request, response, next) => {
    // On vérifie le le courriel et le mot de passe
    // envoyé sont valides
    if (iscourrielValid(request.body.courriel) &&
    ismotDePasseValid(request.body.motDePasse)) {
        // On lance l'authentification avec passport.js
        passport.authenticate('local', (erreur, utilisateur, info) => {
            if (erreur) {
                // S'il y a une erreur, on la passe
                // au serveur
                next(erreur);
            }
            else if (!utilisateur) {
                // Si la connexion échoue, on envoit
                // l'information au client avec un code
                // 401 (Unauthorized)
                response.status(401).json(info);
            }
            else {
                // Si tout fonctionne, on ajoute
                // l'utilisateur dans la session et
                // on retourne un code 200 (OK)
                request.logIn(utilisateur, (erreur) => {
                    if (erreur) {
                        next(erreur);
                    }

                    response.status(200).end();
                });
            }
        })(request, response, next);
    }
    else {
        response.status(400).end();
    }
});


app.post('/api/deconnexion', (request, response,next) => {
    request.logOut((erreur)=>{
        if(erreur){
            next(erreur);
        }
    // Rediriger la page du menu apres deconexion
    response.redirect('/menu');
})
});

app.get('/api/stream', (request, response) => {
    // Si utilisateur est pas connecté, on retourne une erreur 401
    if(request.user === undefined){
        response.status(401).end();
        return
    }
    // Si c'est un admin on initie le stream sinon on retourne une erreur 403
    if(request.user.id_type_utilisateur === 2){
        response.initStream();
        return
    }
    response.status(403).send("Vous n'avez pas les droits pour effectuer cette action");
});


// Ajouter les routes ici ...

const navigation = [
    { title: 'Home', route: '/', access_level: 0, isNotConnected: false },
    { title: 'Menu', route: '/menu', access_level: 0, isNotConnected: false },
    { title: 'Panier', route: '/panier', access_level: 1, isNotConnected: false},
    { title: 'Commandes Soumises', route: '/commandes', access_level: 2, isNotConnected: false},
    { title: 'Inscription', route: '/inscription' , access_level: 0, isNotConnected: true},
    { title: 'Connexion', route: '/connexion' , access_level: 0, isNotConnected: true}
];

const isPageAccessible = (page, user) => {
    const user_access_level = user === undefined ? 0 : user.id_type_utilisateur;
    return (!page.isNotConnected || user === undefined) && user_access_level >= page.access_level; 
}


app.get('/', async(request, response) => {
    
    
    const pageActuel = navigation.find(page => page.route === '/');
    const test = navigation.map(page => {
        return {...page, isAccessible: isPageAccessible(page, request.user)};
    });
    response.render('home', {
        slogan: 'SPECIALITE MAROCAINE AU CANADA',
        pageActuel: pageActuel,
        isAuthentificated: request.user !== undefined,
        navigation: navigation.map(page => {
            return {...page, isAccessible: isPageAccessible(page, request.user)};
        }
    )
    });
});

app.get('/menu', async(request, response) => {

    let  produits = await getProduits();
    let panier = undefined;
    if(request.user !== undefined){
        panier = await getUtilisateurPanier(request.user.id_utilisateur);
    }
    let panier_produits = {};
    if(panier !== undefined){
        // si le panier existe, on récupère les produits du panier
        panier_produits = await getProduitPanier(panier.id_commande);
        // on transforme le tableau en objet pour faciliter la recherche
        panier_produits = panier_produits.panier_produits.reduce((acc, panier_produit) => {
            acc[panier_produit.id_produit] = panier_produit.quantite;
            return acc;
        }, {});
    }
    // on ajoute la quantité et isInPanier à chaque produit
    produits = produits.map(produit => {
        produit.quantite = panier_produits[produit.id_produit] || 0;
        produit.isInPanier = panier_produits[produit.id_produit] !== undefined;
        return produit;
    });
    
    const pageActuel = navigation.find(page => page.route === '/menu');
    response.render('menu', {
        produits: produits,
        pageActuel: pageActuel,
        isAuthentificated: request.user !== undefined,
        navigation: navigation.map(page => {
            return {...page, isAccessible: isPageAccessible(page, request.user)};
        }
    )
    });
});


app.get('/panier', async(request, response) => {
    // Si utilisateur est pas connecté, on retourne une erreur 401
    if(request.user === undefined){
        response.status(401).json({message: 'Utilisateur non connecté.'});
        return;
    }
    const user = request.user;
    const panier = await getUtilisateurPanier(user.id_utilisateur);
    let produits = [];
    let total = 0;
    if(panier !== undefined){
        // si le panier existe, on récupère les produits du panier
        const contenu_panier = await getProduitPanier(panier.id_commande);
        // on transforme le tableau en objet pour faciliter la recherche
        const quantite_produits = contenu_panier.panier_produits.reduce((acc, panier_produit) => {
            acc[panier_produit.id_produit] = panier_produit.quantite;
            return acc;
        }, {});
        // on ajoute la quantité à chaque produit
        produits = contenu_panier.produits.map(produit => {
            produit.quantite = quantite_produits[produit.id_produit] || 0;
            return produit;
        });
        total = produits.reduce((acc, produit) => {
            return acc + produit.prix * produit.quantite;
        }, 0);
    }
    
    const pageActuel = navigation.find(page => page.route === '/panier');
    response.render('panier', {
        produits: produits,
        totalPanier: total,
        pageActuel: pageActuel,
        isAuthentificated: request.user !== undefined,
        navigation: navigation.map(page => {
            return {...page, isAccessible: isPageAccessible(page, request.user)};
        }
    )
    });
});

app.get('/commandes', async(request, response) => {
    // Si utilisateur est pas connecté, on retourne une erreur 401
    if(request.user === undefined){
        response.status(401).json({message: 'Utilisateur non connecté.'});
        return;
    }
    // Si utilisateur est pas admin, on retourne une erreur 403
    if(request.user.id_type_utilisateur !== 2){
        response.status(403).json({message: 'Utilisateur non autorisé.'});
        return;
    }
    // get les etats de commande
    let etat_commandes = (await getEtatCommandes()).filter(etat_commande => etat_commande.id_etat_commande !== 1).map(etat_commande => {
        // capitaliser le nom de l'état de la commande;
        etat_commande.nom = etat_commande.nom.charAt(0).toUpperCase() + etat_commande.nom.slice(1);
        etat_commande.nom = etat_commande.nom === "Terminée" ? etat_commande.nom : "En " + etat_commande.nom;
        return etat_commande;
    }
    );
    // get les commandes soumises
    const commandes = (await getCommandesSoumises()).map(commande => {
        // formater la date
        commande.date = new Date(commande.date).toLocaleDateString();
        // ajouter l'état de la commande à la commande
        commande.etat_commande = etat_commandes.find(etat_commande => etat_commande.id_etat_commande === commande.id_etat_commande);
        return commande;
    });
    
    const pageActuel = navigation.find(page => page.route === '/commandes');
    response.render('commandes', {
        commandes: commandes,
        etatsCommande: etat_commandes,
        pageActuel: pageActuel,
        isAuthentificated: request.user !== undefined,
        navigation: navigation.map(page => {
            return {...page, isAccessible: isPageAccessible(page, request.user)};
        }
    )});
});

// Route de la page d'inscription
app.get('/inscription', async (request, response) => {
    // Vérifier si l'utilisateur est connecté
    if(request.user !== undefined){
        // rediriger l'utilisateur vers la page d'accueil 
        response.redirect('/');
        return;
    }
    const pageActuel = navigation.find(page => page.route === '/inscription');
    response.render('authentification', {
        title: 'Inscription',
        user: request.user,
        isAdmin: request.user !== undefined && request.user.id_type_utilisateur === 2,
        js_script: './js/inscription.js',
        buttonName: 'Inscription',
        pageActuel: pageActuel,
        isAuthentificated: request.user !== undefined,
        navigation: navigation.map(page => {
            return {...page, isAccessible: isPageAccessible(page, request.user)};
        }
    )
    });
});

// Route de la page de connexion
app.get('/connexion', async (request, response) => {
    // Vérifier si l'utilisateur est connecté
    if(request.user !== undefined){
        // rediriger l'utilisateur vers la page d'accueil    
        response.redirect('/menu');
        return;
    }
    const pageActuel = navigation.find(page => page.route === '/inscription');
    response.render('authentification', {
        title: 'Connexion',
        user: request.user,
        isAdmin: request.user !== undefined && request.user.id_type_utilisateur === 2,
        js_script: './js/connexion.js',
        buttonName: 'Connexion',
        pageActuel: pageActuel,
        isAuthentificated: request.user !== undefined,
        navigation: navigation.map(page => {
            return {...page, isAccessible: isPageAccessible(page, request.user)};
        }
    )
    });
});


// Renvoyer une erreur 404 pour les routes non définies
app.use(function (request, response) {
    // Renvoyer simplement une chaîne de caractère indiquant que la page n'existe pas
    response.status(404).send(request.originalUrl + ' not found.');
});


if(process.env.NODE_ENV == 'development'){
let credentials ={
    key: await readFile('./security/localhost.key'),
    cert : await readFile('./security/localhost.cert')
};

https.createServer(credentials, app).listen(process.env.PORT);
console.log(`https://localhost:${ process.env.PORT }`);

} else{
// Démarrage du serveur
app.listen(process.env.PORT);
console.info(`Serveurs démarré:`);
console.log(`http://localhost:${ process.env.PORT }`);
}

