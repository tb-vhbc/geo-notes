class GeoNotes {
	constructor(geoApplication, acfExtensionService){
		this.geoApplication = geoApplication;
		this.acfExtensionService = acfExtensionService;
	}

	injectStyles(){
		if (document.getElementById("geonotes-styles")) { return; }
		var iconSvg = [
			"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>",
				"<path d='M7 19H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1'/>",
				"<path d='M9 5h10a2 2 0 0 1 2 2v10l-5 5H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'/>",
				"<path d='M21 17h-3a2 2 0 0 0-2 2v3'/>",
				"<path d='M10 10h7M10 13h7M10 16h3'/>",
				"<path d='M17.6 5.4l-2.4 2.4'/>",
				"<circle cx='19' cy='4' r='2.2' fill='black' stroke='none'/>",
			"</svg>"
		].join("");
		var iconUrl = "url(\"data:image/svg+xml;charset=utf-8," + encodeURIComponent(iconSvg) + "\")";

		// Icônes des boutons d'action (masques CSS, couleur = currentColor).
		function svgMask(body) {
			var svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'>" + body + "</svg>";
			return "url(\"data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg) + "\")";
		}
		// En cours : flèche « avancer » (fait passer la tâche à la colonne suivante)
		var startUrl = svgMask("<path d='M4 12h15M13 6l6 6-6 6'/>");
		// Terminer : coche
		var doneUrl  = svgMask("<path d='M4.5 12.5l5 5 10-11'/>");
		// Remettre en cours : flèche de retour (annuler)
		var reopenUrl = svgMask("<path d='M9 14L4 9l5-5'/><path d='M4 9h10.5a5.5 5.5 0 0 1 0 11H11'/>");

		var style = document.createElement("style");
		style.id = "geonotes-styles";
		style.textContent = [
			// Centrage exact (le centrage par line-height/vertical-align décale verticalement).
			".geonotes-icon { position: relative; }",
			".geonotes-icon::before {",
			"  content: \"\";",
			"  position: absolute;",
			"  top: 50%;",
			"  left: 50%;",
			"  width: 1em;",
			"  height: 1em;",
			"  margin: -0.5em 0 0 -0.5em;",
			"  background-color: currentColor;",
			"  -webkit-mask: " + iconUrl + " center / contain no-repeat;",
			"  mask: " + iconUrl + " center / contain no-repeat;",
			"}",
			"#dropdown-menu-GEO_NOTES { ",
			" width: 320px;",
    		" padding: 10px;",
			"}",
			// Palette reprise du header GEO : texte #556270, gris #c1cfd9, fond #eaeef0, accent #92c4f0.
			// white-space: normal annule le nowrap hérité de .dropdown-header (Bootstrap).
			".geonotes-widget { white-space: normal; overflow-x: hidden; color: #556270; font-size: 13px; line-height: 1.4; max-height: 70vh; overflow-y: auto; }",
			".geonotes-widget button { cursor: pointer; font: inherit; }",
			".geonotes-add { display: flex; align-items: flex-start; gap: 6px; margin: 0 0 10px; }",
			".geonotes-add textarea { flex: 1; min-width: 0; height: 30px; padding: 5px 8px; border: 1px solid #c1cfd9; border-radius: 0; color: #556270; font: inherit; line-height: 18px; resize: none; overflow: hidden; outline: none; transition: height .25s ease, border-color .25s ease; }",
			".geonotes-add-open textarea { height: 110px; overflow-y: auto; border-color: #00518C; }",
			".geonotes-add button { width: 30px; height: 30px; padding: 0; border: 0; background: #00518C; color: #fcfcfc; font-size: 20px; line-height: 30px; }",
			".geonotes-add button[disabled] { background: #eaeef0; color: #c1cfd9; cursor: default; }",
			".geonotes-lane { margin: 0 0 10px; border-left: 3px solid #69b8f0; background: #f6f8f9; }",
			".geonotes-lane:last-child { margin-bottom: 0; }",
			".geonotes-lane-doing { border-left-color: #2d86c5; }",
			".geonotes-lane-done { border-left-color: #00518C; }",
			".geonotes-lane h4 { display: flex; justify-content: space-between; margin: 0; padding: 6px 8px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: .03em; color: #556270; }",
			".geonotes-count { min-width: 20px; padding: 0 6px; border-radius: 10px; background: #eaeef0; text-align: center; font-weight: normal; }",
			".geonotes-lane ul { list-style: none; margin: 0; padding: 0 6px 6px; }",
			".geonotes-task { display: flex; align-items: flex-start; gap: 6px; margin: 0 0 4px; padding: 5px 6px; background: #fcfcfc; border: 1px solid #eaeef0; }",
			// Extrait : 2 lignes max, puis texte complet (retours à la ligne conservés) au clic.
			".geonotes-title { flex: 1; min-width: 0; max-height: 2.8em; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2;",
			"  white-space: pre-wrap; overflow-wrap: anywhere; cursor: pointer; transition: max-height .3s ease; }",
			".geonotes-title-open { max-height: 40em; -webkit-line-clamp: unset; overflow-y: auto; }",
			".geonotes-lane-done .geonotes-title { text-decoration: line-through; color: #a0afba; }",
			// Boutons ronds à icône : contour gris au repos, rempli de la couleur de la colonne cible au survol.
			".geonotes-move { position: relative; flex: 0 0 auto; width: 22px; height: 22px; padding: 0; border: 1px solid #c1cfd9; border-radius: 50%; background: #fcfcfc; color: #00518C;",
			"  transition: background .2s ease, border-color .2s ease, color .2s ease, transform .15s ease; }",
			".geonotes-move::before { content: ''; position: absolute; top: 50%; left: 50%; width: 12px; height: 12px; margin: -6px 0 0 -6px; background-color: currentColor; }",
			".geonotes-start::before { -webkit-mask: " + startUrl + " center / contain no-repeat; mask: " + startUrl + " center / contain no-repeat; }",
			".geonotes-finish::before { -webkit-mask: " + doneUrl + " center / contain no-repeat; mask: " + doneUrl + " center / contain no-repeat; }",
			".geonotes-move:hover, .geonotes-move:focus-visible { color: #fcfcfc; transform: scale(1.1); outline: none; }",
			".geonotes-start:hover, .geonotes-start:focus-visible { background: #00518C; border-color: #00518C; }",
			".geonotes-start::before { transition: transform .2s ease; }",
			".geonotes-start:hover::before { transform: translateX(2px); }",
			".geonotes-finish:hover, .geonotes-finish:focus-visible { background: #00518C; border-color: #00518C; }",
			".geonotes-reopen::before { -webkit-mask: " + reopenUrl + " center / contain no-repeat; mask: " + reopenUrl + " center / contain no-repeat; transition: transform .2s ease; }",
			".geonotes-reopen:hover, .geonotes-reopen:focus-visible { background: #00518C; border-color: #00518C; }",
			".geonotes-reopen:hover::before { transform: translateX(-2px); }",
			".geonotes-move:active { transform: scale(.95); }",
			".geonotes-delete { flex: 0 0 auto; padding: 0 2px; border: 0; background: transparent; color: #c1cfd9; font-size: 16px; line-height: 1; }",
			".geonotes-delete:hover { color: #df1e18; }",
			".geonotes-empty { padding: 2px 6px 4px; color: #a0afba; font-style: italic; }"
		].join("\n");
		document.head.appendChild(style);
	}

	registerWidget(){
		var app = this.geoApplication;
		this.acfExtensionService.registerWidgetExtension({
			type:         'header',
			key:          'GEO_NOTES',
			extensionKey: 'GEO_NOTES',
			name:         "GeoNotes",
			icon:         "geonotes-icon",
			active:       true,
			enable:       function () { return true; },
			// Le menu est un dropdown Bootstrap 3 : tout clic qui remonte jusqu'au document le ferme,
			// d'où le stopPropagation sur la racine du widget.
			template:     [
				'<div class="geonotes-widget" ng-click="$event.stopPropagation()">',
					// Le champ s'agrandit (transition de hauteur) au focus ou dès qu'il contient du texte.
					'<form class="geonotes-add" ng-class="{\'geonotes-add-open\': draft.focused || draft.title}" ng-submit="add()">',
						'<textarea ng-model="draft.title" placeholder="Nouvelle tâche…" maxlength="2000"',
							' ng-focus="draft.focused = true" ng-blur="draft.focused = false" ng-keydown="onDraftKey($event)"',
							' title="Ctrl+Entrée pour ajouter"></textarea>',
						'<button type="submit" ng-disabled="!draft.title.trim()" title="Ajouter la tâche (Ctrl+Entrée)">+</button>',
					'</form>',
					'<section class="geonotes-lane geonotes-lane-{{lane.id}}" ng-repeat="lane in lanes">',
						'<h4>{{lane.label}} <span class="geonotes-count">{{count(lane.id)}}</span></h4>',
						'<ul>',
							'<li class="geonotes-task" ng-repeat="task in tasks | filter:{status: lane.id}:true track by task.id">',
								// Extrait sur 2 lignes ; un clic affiche / masque le texte complet.
								'<div class="geonotes-title" ng-class="{\'geonotes-title-open\': expanded[task.id]}" ng-click="expanded[task.id] = !expanded[task.id]"',
									' title="{{expanded[task.id] ? \'Réduire\' : \'Afficher le texte complet\'}}">{{task.title}}</div>',
								'<button type="button" class="geonotes-move geonotes-start" ng-if="task.status === \'todo\'" ng-click="setStatus(task, \'doing\')" title="Passer en cours" aria-label="Passer en cours"></button>',
								'<button type="button" class="geonotes-move geonotes-finish" ng-if="task.status === \'doing\'" ng-click="setStatus(task, \'done\')" title="Terminer" aria-label="Terminer"></button>',
								'<button type="button" class="geonotes-move geonotes-reopen" ng-if="task.status === \'done\'" ng-click="setStatus(task, \'doing\')" title="Remettre en cours" aria-label="Remettre en cours"></button>',
								'<button type="button" class="geonotes-delete" ng-click="remove(task)" title="Supprimer">&times;</button>',
							'</li>',
							'<li class="geonotes-empty" ng-if="!count(lane.id)">Aucune tâche</li>',
						'</ul>',
					'</section>',
				'</div>'
			].join(""),
			controller:   ["$scope", function ($scope) {
				var key = GeoNotes.storageKey();
				
				$scope.lanes = [
					{ id: "todo",  label: "À faire" },
					{ id: "doing", label: "En cours" },
					{ id: "done",  label: "Réalisé" }
				];
				$scope.tasks = GeoNotes.load(key);
				$scope.draft = { title: "", focused: false };
				$scope.expanded = {}; // état d'affichage (non persisté) : id -> texte complet visible

				function save() { GeoNotes.save(key, $scope.tasks); }

				$scope.count = function (status) {
					return $scope.tasks.filter(function (t) { return t.status === status; }).length;
				};

				$scope.add = function () {
					var title = ($scope.draft.title || "").trim();
					if (!title) { return; }
					$scope.tasks.push({
						id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
						title: title,
						status: "todo",
						createdAt: new Date().toISOString()
					});
					$scope.draft.title = "";
					save();
				};

				$scope.setStatus = function (task, status) {
					task.status = status;
					task.updatedAt = new Date().toISOString();
					save();
				};

				// Entrée = retour à la ligne ; Ctrl/Cmd+Entrée = ajouter.
				$scope.onDraftKey = function (e) {
					if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
						e.preventDefault();
						$scope.add();
					}
				};

				$scope.remove = function (task) {
					$scope.tasks = $scope.tasks.filter(function (t) { return t !== task; });
					save();
				};

				// Synchronisation si les notes sont modifiées dans un autre onglet de la même application.
				function onStorage(e) {
					if (e.key !== key) { return; }
					$scope.$applyAsync(function () { $scope.tasks = GeoNotes.load(key); });
				}
				window.addEventListener("storage", onStorage);
				$scope.$on("$destroy", function () { window.removeEventListener("storage", onStorage); });
			}]
		});
	}

	// Clé localStorage = identifiant de l'application dans l'URL :
	// https://geo.../aws/app/<id>/index.html -> <id>
	static storageKey(){
		var match = window.location.pathname.match(/\/app\/([^\/]+)/);
		return match ? 'notes-' + match[1] : window.location.pathname;
	}

	static load(key){
		try {
			var tasks = JSON.parse(window.localStorage.getItem(key) || "[]");
			return Array.isArray(tasks) ? tasks : [];
		} catch (e) {
			return [];
		}
	}

	static save(key, tasks){
		try {
			// angular.toJson retire les propriétés internes ($$hashKey…)
			window.localStorage.setItem(key, angular.toJson(tasks));
		} catch (e) {
			console.warn("[GeoNotes] Impossible d'enregistrer les tâches", e);
		}
	}
}



angular
	.module("GeoNotes", ["bg.acf.base","bg.common.geo.GeoApi"])
	.run(["geoApplication", "acfExtensionService", function(geoApplication, acfExtensionService) {
		geoApplication.executeWhenInitialized(function () {
			var notes = new GeoNotes(geoApplication, acfExtensionService);
			notes.injectStyles();
			notes.registerWidget();
		});
	}]);
