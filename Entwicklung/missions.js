window.H3_DATA = {
  "missions": [
    {
      "id": "stadttermin",
      "title": "Ein Termin am Spital",
      "subtitle": "Sitzender Transport ohne Betreuungsbedarf",
      "patient": {
        "name": "Elena Widmer",
        "age": 59,
        "visual": "walking",
        "quote": "Ich kann selbst einsteigen. Bitte sagen Sie mir nur, wo ich am Spital aussteige.",
        "sex": "female",
        "mobility": "walk"
      },
      "pickup": {
        "id": "home",
        "x": -88,
        "z": -52,
        "label": "Pflegezentrum am Quai"
      },
      "destination": {
        "id": "hospital",
        "x": 77,
        "z": 54,
        "label": "Spital Lindenhafen"
      },
      "appointmentTime": "09:30",
      "pickupTime": "09:00",
      "returnPlan": "Rückfahrt ab 10:30 an der ambulanten Anmeldung bestätigt. Frau Widmer meldet eine Verzögerung dem vereinbarten Dienst.",
      "escort": "Keine zusätzliche Begleitung; im Fall so abgeklärt.",
      "condition": "Stabiler Zustand, planbare Kontrolle. Kein medizinischer Betreuungs- oder Überwachungsbedarf für die Fahrt.",
      "mobility": "Geht selbstständig sicher und kann ohne Hilfe auf einen Fahrzeugsitz wechseln. Keine Mobilitätshilfsmittel für diesen Weg nötig.",
      "transportOrder": "Sitzender Transport, selbstständiger Ein-/Ausstieg.",
      "requiredVehicleId": "taxi",
      "vehicleReason": "Die Person kann den Weg und das Ein-/Aussteigen selbstständig bewältigen. Das bestätigte Sitzkombi-Angebot erfüllt den im Fall erhobenen Bedarf.",
      "dialogue": [
        {
          "id": "mobility",
          "question": "Welche Unterstützung benötigen Sie unterwegs?",
          "answer": "Ich gehe sicher und steige selbstständig ein und aus. Für diese Kontrolle brauche ich unterwegs keine Betreuung."
        },
        {
          "id": "preparation",
          "question": "Welche Dinge sollen mitkommen?",
          "answer": "Die Anmeldung braucht meine vorbereitete Terminmappe und die Versicherungskarte. Eine kleine Wasserflasche nehme ich gern mit; Trinken ist für den Termin erlaubt."
        },
        {
          "id": "return",
          "question": "Wie ist der Rückweg geklärt?",
          "answer": "Die Rückfahrt ist ab 10:30 an derselben Anmeldung bestätigt. Falls es später wird, rufe ich den Dienst an."
        }
      ],
      "packOptions": [
        {
          "id": "documents",
          "label": "Geschlossene Terminmappe",
          "status": "required",
          "reason": "Die ambulante Anmeldung erwartet die vorbereitete Zuweisung und Terminbestätigung."
        },
        {
          "id": "insurance",
          "label": "Versicherungskarte",
          "status": "required",
          "reason": "Die Zielstelle verlangt die persönliche Karte für die Anmeldung."
        },
        {
          "id": "water",
          "label": "Kleine Wasserflasche",
          "status": "optional",
          "reason": "Von Frau Widmer gewünscht und für den Termin erlaubt; keine Pflicht für jeden Transport."
        },
        {
          "id": "oxygen",
          "label": "Sauerstoffgerät",
          "status": "leave",
          "reason": "Für diesen Fall gibt es keinen Auftrag oder angegebenen Bedarf."
        },
        {
          "id": "fullrecord",
          "label": "Gesamte Patientenakte",
          "status": "leave",
          "reason": "Die benötigten Unterlagen sind ausgewählt. Nicht pauschal die gesamte Akte weitergeben."
        },
        {
          "id": "walker",
          "label": "Rollator",
          "status": "leave",
          "reason": "Frau Widmer benötigt für den beschriebenen Weg kein Mobilitätshilfsmittel."
        }
      ],
      "costs": "Frau Widmer hat die für diesen fiktiven Auftrag bestätigte Selbstzahlung akzeptiert. Daraus folgt keine allgemeine Aussage zur Versicherungsdeckung.",
      "handover": [
        {
          "id": "identity",
          "label": "Identität, Ziel und Termin abgleichen",
          "required": true,
          "reason": "Person, Dienst und Auftrag müssen zusammenpassen."
        },
        {
          "id": "mobility",
          "label": "Selbstständigen Ein-/Ausstieg und richtigen Absetzpunkt bestätigen",
          "required": true,
          "reason": "Die tatsächlich benötigte Unterstützung und das bestätigte Angebot gehören zusammen."
        },
        {
          "id": "documents",
          "label": "Benötigte Unterlagen geschlossen an die berechtigte Ziel- oder Begleitperson übergeben",
          "required": true,
          "reason": "Nur notwendige, berechtigt weitergegebene Informationen aushändigen."
        },
        {
          "id": "return",
          "label": "Bestätigte Rückfahrt ab 10:30 nennen",
          "required": true,
          "reason": "Die vereinbarte Begleitung und der Rückweg beziehungsweise Verlegungsauftrag müssen gesichert sein."
        },
        {
          "id": "private",
          "label": "Private Angaben ohne Bezug zur Fahrt ergänzen",
          "required": false,
          "reason": "Diese Angaben werden für den Transport nicht benötigt."
        }
      ],
      "check": {
        "question": "Welcher Fallhinweis bestimmt hier die Fahrzeugwahl?",
        "options": [
          {
            "id": "independent",
            "label": "Selbstständiger Ein-/Ausstieg und kein zusätzlicher Betreuungsbedarf"
          },
          {
            "id": "age",
            "label": "Allein das Alter der Person"
          },
          {
            "id": "hospital",
            "label": "Das Ziel Spital verlangt immer einen Rettungswagen"
          }
        ],
        "correctId": "independent",
        "feedback": "Das Zielgebäude allein bestimmt die Transportart nicht. Entscheidend ist der konkrete Unterstützungsbedarf."
      },
      "sources": [
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 71–73 Transportwahl",
          "url": "https://app.edubase.ch/#doc/60586/71",
          "status": "Vollständig gelesen durch Edubase-Chat am 27.10.2026; Fundstellen am 25.11.2026 bestätigt. Buchseite = Dokumentseite. Heute keine erneute Lektüre möglich."
        },
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 84–85 Vorbereitung",
          "url": "https://app.edubase.ch/#doc/60586/84",
          "status": "Früher vollständig gelesen; Buchseite = Dokumentseite bestätigt."
        },
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 85–87 Information und Begleitung",
          "url": "https://app.edubase.ch/#doc/60586/85",
          "status": "Früher vollständig gelesen; S. 87 nur oben transportbezogen."
        }
      ],
      "finishReflection": "Nenne den entscheidenden Fallhinweis, zwei begründete Vorbereitungen und eine notwendige Absprache.",
      "roleNote": "Die Fahrsteuerung ist eine abstrahierte Spielmechanik. Im Berufsalltag fahren entsprechend berechtigte Personen; Betreuung, Verladung und Sicherung richten sich nach Auftrag, Qualifikation und betrieblichem Vorgehen.",
      "needsWishConversation": true,
      "bookingStatus": "Dieses konkrete Angebot ist mit zuständiger Stelle, Dienst, Person und nötiger Begleitung für den beschriebenen Auftrag bestätigt. Andere sichtbare Fahrzeuge sind nicht automatisch für diesen Auftrag freigegeben.",
      "vehicleType": "taxi",
      "dropoff": {
        "id": "hospital",
        "x": 77,
        "z": 54,
        "label": "Spital Lindenhafen"
      }
    },
    {
      "id": "augenpraxis",
      "title": "Mit Begleitung zur Augenpraxis",
      "subtitle": "Faltrollstuhl und vereinbarte Hilfe",
      "patient": {
        "name": "Selma Yilmaz",
        "age": 78,
        "visual": "seated",
        "quote": "In fremden Gebäuden sehe ich die Wegweiser kaum. Meine Tochter begleitet mich.",
        "sex": "female",
        "mobility": "assisted"
      },
      "pickup": {
        "id": "residence",
        "x": -31,
        "z": 54,
        "label": "Wohnen am Park"
      },
      "destination": {
        "id": "practice",
        "x": 24,
        "z": -46,
        "label": "Gesundheitszentrum am Park"
      },
      "appointmentTime": "10:00",
      "pickupTime": "09:15",
      "returnPlan": "Rückfahrt ab Praxis um 11:15 bestätigt. Elif meldet eine Verzögerung.",
      "escort": "Tochter Elif ist eingetroffen; Hilfe beim Ein-/Aussteigen, Begleitung in der Praxis und Rückfahrt sind bestätigt.",
      "condition": "Stabil, planbare Kontrolle. Keine medizinische Betreuung oder Überwachung während der Fahrt erforderlich.",
      "mobility": "Kurze Wege mit Begleitung; längere Wege im Faltrollstuhl. Mit einer Person sicher auf den Autositz umsetzbar. Faltrollstuhl ist angemeldet.",
      "transportOrder": "Sitzplatz nach vereinbartem Umsetzen; Faltrollstuhl kommt zusammengefaltet mit.",
      "requiredVehicleId": "volunteer",
      "vehicleReason": "Das konkret bestätigte Angebot nimmt Faltrollstuhl und Elif mit; Elif übernimmt die vereinbarte Unterstützung. Der Dienst bietet keine medizinische Betreuung.",
      "dialogue": [
        {
          "id": "mobility",
          "question": "Wie bewältigen Sie Weg und Einsteigen?",
          "answer": "Kurze Wege gehen mit Begleitung. Für längere Wege habe ich meinen Faltrollstuhl. Mit einer Person kann ich sicher auf den Autositz wechseln."
        },
        {
          "id": "escort",
          "question": "Wer übernimmt die vereinbarte Unterstützung?",
          "answer": "Meine Tochter Elif ist da. Sie hilft beim Ein- und Aussteigen, begleitet mich in die Praxis und fährt zurück mit."
        },
        {
          "id": "preparation",
          "question": "Was soll bereit sein?",
          "answer": "Bitte meine Brille, Jacke und die geschlossene Terminmappe bereitlegen. Die Mappe enthält auch die verlangte Medikamentenliste und Versicherungskarte. Eine kleine Wasserflasche wäre schön; Trinken ist erlaubt."
        }
      ],
      "packOptions": [
        {
          "id": "documents",
          "label": "Geschlossene Terminmappe",
          "status": "required",
          "reason": "Überweisung, freigegebene aktuelle Medikamentenliste und verlangte Versicherungskarte liegen für die Augenpraxis bereit."
        },
        {
          "id": "glasses",
          "label": "Persönliche Brille",
          "status": "required",
          "reason": "Frau Yilmaz wünscht ihre Brille für Orientierung und Kommunikation."
        },
        {
          "id": "jacket",
          "label": "Jacke bereitlegen",
          "status": "required",
          "reason": "Die Patientin wünscht die Jacke; sie wird vor dem Weg nach draussen angezogen."
        },
        {
          "id": "water",
          "label": "Kleine Wasserflasche",
          "status": "optional",
          "reason": "Gewünscht und für diesen Kontrolltermin erlaubt."
        },
        {
          "id": "fullrecord",
          "label": "Gesamte Patientenakte",
          "status": "leave",
          "reason": "Die erforderlichen Unterlagen sind bereits ausgewählt."
        },
        {
          "id": "meds",
          "label": "Zusätzlich selbst zusammengestellte Medikamente",
          "status": "leave",
          "reason": "Für unterwegs liegt kein Medikamentenauftrag vor. Nicht eigenständig auswählen oder dosieren."
        }
      ],
      "costs": "Die zuständige Stelle hat Kosten und Zahlungsweise dieses konkreten Fahrdienstangebots mit der Patientin geklärt. Keine pauschale Versicherungszusage.",
      "handover": [
        {
          "id": "identity",
          "label": "Identität, Ziel und Termin abgleichen",
          "required": true,
          "reason": "Person, Dienst und Auftrag müssen zusammenpassen."
        },
        {
          "id": "mobility",
          "label": "Faltrollstuhl und vereinbarte Hilfe beim Umsetzen nennen",
          "required": true,
          "reason": "Die tatsächlich benötigte Unterstützung und das bestätigte Angebot gehören zusammen."
        },
        {
          "id": "documents",
          "label": "Benötigte Unterlagen geschlossen an die berechtigte Ziel- oder Begleitperson übergeben",
          "required": true,
          "reason": "Nur notwendige, berechtigt weitergegebene Informationen aushändigen."
        },
        {
          "id": "return",
          "label": "Elifs tatsächlich gesicherte Begleitung und Rückfahrt um 11:15 bestätigen",
          "required": true,
          "reason": "Die vereinbarte Begleitung und der Rückweg beziehungsweise Verlegungsauftrag müssen gesichert sein."
        },
        {
          "id": "private",
          "label": "Private Angaben ohne Bezug zur Fahrt ergänzen",
          "required": false,
          "reason": "Diese Angaben werden für den Transport nicht benötigt."
        }
      ],
      "check": {
        "question": "Warum passt dieses konkrete Angebot?",
        "options": [
          {
            "id": "agreement",
            "label": "Faltrollstuhl, Begleitplatz und sichere Unterstützung sind ausdrücklich bestätigt"
          },
          {
            "id": "brand",
            "label": "Jeder freiwillige Fahrdienst bietet automatisch dieselben Leistungen"
          },
          {
            "id": "chair",
            "label": "Der Faltrollstuhl verlangt immer einen Liegendtransport"
          }
        ],
        "correctId": "agreement",
        "feedback": "Die Fähigkeiten der Person und das konkrete Angebot müssen zusammenpassen. Hilfe und Plätze werden ausdrücklich vereinbart."
      },
      "sources": [
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 71–73 Transportwahl",
          "url": "https://app.edubase.ch/#doc/60586/71",
          "status": "Vollständig gelesen durch Edubase-Chat am 27.10.2026; Fundstellen am 25.11.2026 bestätigt. Buchseite = Dokumentseite. Heute keine erneute Lektüre möglich."
        },
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 84–85 Vorbereitung",
          "url": "https://app.edubase.ch/#doc/60586/84",
          "status": "Früher vollständig gelesen; Buchseite = Dokumentseite bestätigt."
        },
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 85–87 Information und Begleitung",
          "url": "https://app.edubase.ch/#doc/60586/85",
          "status": "Früher vollständig gelesen; S. 87 nur oben transportbezogen."
        }
      ],
      "finishReflection": "Nenne den entscheidenden Fallhinweis, zwei begründete Vorbereitungen und eine notwendige Absprache.",
      "roleNote": "Die Fahrsteuerung ist eine abstrahierte Spielmechanik. Im Berufsalltag fahren entsprechend berechtigte Personen; Betreuung, Verladung und Sicherung richten sich nach Auftrag, Qualifikation und betrieblichem Vorgehen.",
      "needsWishConversation": true,
      "bookingStatus": "Dieses konkrete Angebot ist mit zuständiger Stelle, Dienst, Person und nötiger Begleitung für den beschriebenen Auftrag bestätigt. Andere sichtbare Fahrzeuge sind nicht automatisch für diesen Auftrag freigegeben.",
      "vehicleType": "volunteer",
      "dropoff": {
        "id": "practice",
        "x": 24,
        "z": -46,
        "label": "Gesundheitszentrum am Park"
      }
    },
    {
      "id": "rollstuhl",
      "title": "Im eigenen Rollstuhl zur Kontrolle",
      "subtitle": "Beförderung ohne Umsetzen",
      "patient": {
        "name": "Peter Graf",
        "age": 84,
        "visual": "wheelchair",
        "quote": "Bitte lassen Sie mich in meinem angepassten Rollstuhl. Umsetzen geht im Moment nicht sicher.",
        "sex": "male",
        "mobility": "wheelchair"
      },
      "pickup": {
        "id": "home",
        "x": -88,
        "z": -52,
        "label": "Pflegezentrum am Quai"
      },
      "destination": {
        "id": "hospital",
        "x": 77,
        "z": 54,
        "label": "Spital Lindenhafen"
      },
      "appointmentTime": "13:30",
      "pickupTime": "12:30",
      "returnPlan": "Rückfahrt ab 15:00 bestätigt; Nora klärt Verzögerungen mit Praxis und Dienst.",
      "escort": "Pflegeperson Nora ist für Hin- und Rückweg verbindlich eingeteilt und verfügbar.",
      "condition": "Stabil; planbare Kontrolle. Kein medizinischer Überwachungsbedarf während der Fahrt angegeben.",
      "mobility": "Beförderung im eigenen besetzten Rollstuhl erforderlich. Sicheres Aufstehen oder Umsetzen ist nicht möglich.",
      "transportOrder": "Eigener besetzter Rollstuhl, zugänglicher Abholort, Begleitplatz für Nora. Transportteam verantwortet Verladung und Sicherung.",
      "requiredVehicleId": "wheelchair",
      "vehicleReason": "Ein normaler Fahrzeugsitz erfüllt den Bedarf nicht. Der bestätigte Rollstuhlbus kann den eigenen besetzten Rollstuhl und Nora mitnehmen.",
      "dialogue": [
        {
          "id": "mobility",
          "question": "Können Sie auf einen Fahrzeugsitz wechseln?",
          "answer": "Nein, das geht zurzeit nicht sicher. Ich bleibe in meinem angepassten Rollstuhl."
        },
        {
          "id": "escort",
          "question": "Welche Begleitung und welcher Zugang sind geklärt?",
          "answer": "Nora begleitet mich. Der Dienst hat den zugänglichen Abholort und den Platz für meinen Rollstuhl bestätigt. Sein Team übernimmt Verladung und Sicherung."
        },
        {
          "id": "preparation",
          "question": "Was möchten Sie mitnehmen?",
          "answer": "Bitte die geschlossene Terminmappe, mein Hörgerät im beschrifteten Etui und die leichte Decke. Ein Päckchen Taschentücher können Sie gern ergänzen. Ich möchte unterwegs Ruhe; die Kopfhörer bleiben hier."
        }
      ],
      "packOptions": [
        {
          "id": "documents",
          "label": "Geschlossene Terminmappe",
          "status": "required",
          "reason": "Benötigte Überweisung, aktuelle freigegebene Medikamentenliste und verlangte Versicherungskarte sind vorbereitet."
        },
        {
          "id": "hearing",
          "label": "Hörgerät im beschrifteten Etui",
          "status": "required",
          "reason": "Herr Graf wünscht sein persönliches Hörgerät für das Gespräch in der Praxis."
        },
        {
          "id": "blanket",
          "label": "Leichte Decke",
          "status": "required",
          "reason": "Vom Patienten für die Fahrt gewünscht."
        },
        {
          "id": "tissues",
          "label": "Taschentücher",
          "status": "optional",
          "reason": "Als persönliche Ergänzung ausdrücklich möglich, nicht zwingend."
        },
        {
          "id": "walker",
          "label": "Rollator",
          "status": "leave",
          "reason": "Ein Rollator ersetzt den benötigten eigenen Rollstuhl nicht."
        },
        {
          "id": "headphones",
          "label": "Kopfhörer",
          "status": "leave",
          "reason": "Herr Graf möchte Ruhe und lässt die Kopfhörer ausdrücklich hier."
        }
      ],
      "costs": "Die Administration hat die Kostenregelung dieses Rollstuhltransports vor der verbindlichen Bestätigung geklärt. Keine automatische Versicherungsdeckung annehmen.",
      "handover": [
        {
          "id": "identity",
          "label": "Identität, Ziel und Termin abgleichen",
          "required": true,
          "reason": "Person, Dienst und Auftrag müssen zusammenpassen."
        },
        {
          "id": "mobility",
          "label": "Beförderung im eigenen Rollstuhl ohne Umsetzen bestätigen",
          "required": true,
          "reason": "Die tatsächlich benötigte Unterstützung und das bestätigte Angebot gehören zusammen."
        },
        {
          "id": "documents",
          "label": "Benötigte Unterlagen geschlossen an die berechtigte Ziel- oder Begleitperson übergeben",
          "required": true,
          "reason": "Nur notwendige, berechtigt weitergegebene Informationen aushändigen."
        },
        {
          "id": "return",
          "label": "Noras Begleitung und vereinbarte Rückfahrt ab 15:00 nennen",
          "required": true,
          "reason": "Die vereinbarte Begleitung und der Rückweg beziehungsweise Verlegungsauftrag müssen gesichert sein."
        },
        {
          "id": "private",
          "label": "Private Angaben ohne Bezug zur Fahrt ergänzen",
          "required": false,
          "reason": "Diese Angaben werden für den Transport nicht benötigt."
        }
      ],
      "check": {
        "question": "Was schliesst den normalen Sitzkombi in diesem Fall aus?",
        "options": [
          {
            "id": "transfer",
            "label": "Sicheres Umsetzen auf einen Autositz ist nicht möglich"
          },
          {
            "id": "age",
            "label": "Alle Personen ab 80 Jahren brauchen einen Rollstuhlbus"
          },
          {
            "id": "clinic",
            "label": "Die Praxis ist in einem Spital"
          }
        ],
        "correctId": "transfer",
        "feedback": "Die konkrete Mobilität und das sichere Umsetzen sind ausschlaggebend; Alter oder Ziel allein reichen nicht."
      },
      "sources": [
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 71–73 Transportwahl",
          "url": "https://app.edubase.ch/#doc/60586/71",
          "status": "Vollständig gelesen durch Edubase-Chat am 27.10.2026; Fundstellen am 25.11.2026 bestätigt. Buchseite = Dokumentseite. Heute keine erneute Lektüre möglich."
        },
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 84–85 Vorbereitung",
          "url": "https://app.edubase.ch/#doc/60586/84",
          "status": "Früher vollständig gelesen; Buchseite = Dokumentseite bestätigt."
        },
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 85–87 Information und Begleitung",
          "url": "https://app.edubase.ch/#doc/60586/85",
          "status": "Früher vollständig gelesen; S. 87 nur oben transportbezogen."
        }
      ],
      "finishReflection": "Nenne den entscheidenden Fallhinweis, zwei begründete Vorbereitungen und eine notwendige Absprache.",
      "roleNote": "Die Fahrsteuerung ist eine abstrahierte Spielmechanik. Im Berufsalltag fahren entsprechend berechtigte Personen; Betreuung, Verladung und Sicherung richten sich nach Auftrag, Qualifikation und betrieblichem Vorgehen.",
      "needsWishConversation": true,
      "bookingStatus": "Dieses konkrete Angebot ist mit zuständiger Stelle, Dienst, Person und nötiger Begleitung für den beschriebenen Auftrag bestätigt. Andere sichtbare Fahrzeuge sind nicht automatisch für diesen Auftrag freigegeben.",
      "vehicleType": "wheelchair",
      "dropoff": {
        "id": "hospital",
        "x": 77,
        "z": 54,
        "label": "Spital Lindenhafen"
      }
    },
    {
      "id": "liegend",
      "title": "Planbar im Liegen",
      "subtitle": "Vereinbarte Transportposition einhalten",
      "patient": {
        "name": "Mara Berger",
        "age": 67,
        "visual": "stretcher",
        "quote": "Für die Fahrt ist Liegen vereinbart. Bitte ändern Sie den Auftrag nicht einfach.",
        "sex": "female",
        "mobility": "lying"
      },
      "pickup": {
        "id": "rehab",
        "x": -31,
        "z": -52,
        "label": "Rehazentrum Uferblick"
      },
      "destination": {
        "id": "hospital",
        "x": 77,
        "z": 54,
        "label": "Spital Lindenhafen"
      },
      "appointmentTime": "14:30",
      "pickupTime": "13:30",
      "returnPlan": "Rückfahrt ab 16:15 mit demselben erforderlichen Leistungsumfang bestätigt; Leandro meldet Verzögerungen.",
      "escort": "Pflegeperson Leandro begleitet gemäss bestätigter Absprache.",
      "condition": "Stabiler Zustand; geplante Nachkontrolle. Keine neuen Beschwerden im fiktiven Auftrag; medizinische Überwachung ist für die Fahrt nicht angeordnet.",
      "mobility": "Für diese einzelne Fahrt ist eine Beförderung im Liegen durch die zuständige Pflegefachperson mit dem Behandlungsteam geklärt.",
      "transportOrder": "Liegende Beförderung, vereinbarte Unterstützung und Begleitplatz für Leandro. Nicht eigenständig auf sitzende Beförderung umstellen.",
      "requiredVehicleId": "lying",
      "vehicleReason": "Der bestätigte Liegendfahrdienst erfüllt den geklärten Auftrag. Ein Liegeplatz allein wäre bei zusätzlichem Überwachungsbedarf nicht ausreichend; dieser ist hier ausdrücklich nicht angegeben.",
      "dialogue": [
        {
          "id": "position",
          "question": "Was ist für Ihre Transportposition vereinbart?",
          "answer": "Für diese Fahrt steht Liegen im Auftrag. Die Pflegefachperson hat das mit dem Behandlungsteam geklärt."
        },
        {
          "id": "escort",
          "question": "Wer begleitet und übernimmt die Übergabe?",
          "answer": "Leandro begleitet mich und übergibt mich in der Klinik. Er kennt auch die bestätigte Rückfahrt ab 16:15."
        },
        {
          "id": "preparation",
          "question": "Welche Dinge möchten Sie bereit haben?",
          "answer": "Bitte die geschlossene Terminmappe, meine Brille und die leichte Decke mitgeben. Für die Wartezeit ist ein Taschenbuch schön, falls Platz ist. Es gibt keinen Medikamentenauftrag für unterwegs."
        }
      ],
      "packOptions": [
        {
          "id": "documents",
          "label": "Geschlossene Terminmappe",
          "status": "required",
          "reason": "Die Klinik erwartet Überweisung mit benötigtem aktuellem Behandlungsbericht, freigegebener Medikamentenliste und verlangter Versicherungskarte."
        },
        {
          "id": "glasses",
          "label": "Persönliche Brille",
          "status": "required",
          "reason": "Für das Gespräch in der Klinik von Frau Berger gewünscht."
        },
        {
          "id": "blanket",
          "label": "Leichte Decke",
          "status": "required",
          "reason": "Für Wärme und Wohlbefinden ausdrücklich gewünscht."
        },
        {
          "id": "book",
          "label": "Taschenbuch",
          "status": "optional",
          "reason": "Von der Patientin für die Wartezeit als zusätzliche Möglichkeit genannt."
        },
        {
          "id": "oxygen",
          "label": "Sauerstoffgerät",
          "status": "leave",
          "reason": "Es gibt im Fall keinen entsprechenden Auftrag oder Bedarf."
        },
        {
          "id": "meds",
          "label": "Selbst zusammengestellte Medikamente",
          "status": "leave",
          "reason": "Kein Medikamentenauftrag für unterwegs; keine eigene Auswahl oder Dosierung."
        }
      ],
      "costs": "Die zuständige Stelle hat die Kostenregelung für dieses bestätigte Angebot geklärt. Das Spiel macht keine pauschale Kostengutsprache.",
      "handover": [
        {
          "id": "identity",
          "label": "Identität, Ziel und Termin abgleichen",
          "required": true,
          "reason": "Person, Dienst und Auftrag müssen zusammenpassen."
        },
        {
          "id": "mobility",
          "label": "Geklärten Auftrag zur liegenden Beförderung und passende Leistung bestätigen",
          "required": true,
          "reason": "Die tatsächlich benötigte Unterstützung und das bestätigte Angebot gehören zusammen."
        },
        {
          "id": "documents",
          "label": "Benötigte Unterlagen geschlossen an die berechtigte Ziel- oder Begleitperson übergeben",
          "required": true,
          "reason": "Nur notwendige, berechtigt weitergegebene Informationen aushändigen."
        },
        {
          "id": "return",
          "label": "Leandros Begleitung und Rückfahrt ab 16:15 nennen",
          "required": true,
          "reason": "Die vereinbarte Begleitung und der Rückweg beziehungsweise Verlegungsauftrag müssen gesichert sein."
        },
        {
          "id": "private",
          "label": "Private Angaben ohne Bezug zur Fahrt ergänzen",
          "required": false,
          "reason": "Diese Angaben werden für den Transport nicht benötigt."
        }
      ],
      "check": {
        "question": "Warum ist der Liegendtransporter hier passend?",
        "options": [
          {
            "id": "order",
            "label": "Der geklärte Auftrag verlangt Liegen; der konkrete Dienst erfüllt ihn ohne zusätzlich benötigte medizinische Überwachung"
          },
          {
            "id": "bed",
            "label": "Jede Person nach einer Operation muss im Liegen fahren"
          },
          {
            "id": "change",
            "label": "Die Transportposition darf beim Einsteigen frei geändert werden"
          }
        ],
        "correctId": "order",
        "feedback": "Der bestätigte konkrete Auftrag ist ausschlaggebend. Es wird keine allgemeine Regel für alle Menschen nach Operationen abgeleitet."
      },
      "sources": [
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 71–73 Transportwahl",
          "url": "https://app.edubase.ch/#doc/60586/71",
          "status": "Vollständig gelesen durch Edubase-Chat am 27.10.2026; Fundstellen am 25.11.2026 bestätigt. Buchseite = Dokumentseite. Heute keine erneute Lektüre möglich."
        },
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 84–85 Vorbereitung",
          "url": "https://app.edubase.ch/#doc/60586/84",
          "status": "Früher vollständig gelesen; Buchseite = Dokumentseite bestätigt."
        },
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 85–87 Information und Begleitung",
          "url": "https://app.edubase.ch/#doc/60586/85",
          "status": "Früher vollständig gelesen; S. 87 nur oben transportbezogen."
        }
      ],
      "finishReflection": "Nenne den entscheidenden Fallhinweis, zwei begründete Vorbereitungen und eine notwendige Absprache.",
      "roleNote": "Die Fahrsteuerung ist eine abstrahierte Spielmechanik. Im Berufsalltag fahren entsprechend berechtigte Personen; Betreuung, Verladung und Sicherung richten sich nach Auftrag, Qualifikation und betrieblichem Vorgehen.",
      "needsWishConversation": true,
      "bookingStatus": "Dieses konkrete Angebot ist mit zuständiger Stelle, Dienst, Person und nötiger Begleitung für den beschriebenen Auftrag bestätigt. Andere sichtbare Fahrzeuge sind nicht automatisch für diesen Auftrag freigegeben.",
      "vehicleType": "lying",
      "dropoff": {
        "id": "hospital",
        "x": 77,
        "z": 54,
        "label": "Spital Lindenhafen"
      }
    },
    {
      "id": "verlegung",
      "title": "Verlegung mit Fachteam",
      "subtitle": "Überwachungsbedarf braucht das passende Team",
      "patient": {
        "name": "Daniel Frei",
        "age": 72,
        "visual": "stretcher",
        "quote": "Das Rettungsdienstteam ist für die Fahrt vereinbart. Bitte geben Sie ihm den vorbereiteten Auftrag.",
        "sex": "male",
        "mobility": "lying"
      },
      "pickup": {
        "id": "practice",
        "x": 24,
        "z": -46,
        "label": "Gesundheitszentrum am Park"
      },
      "destination": {
        "id": "hospital",
        "x": 77,
        "z": 54,
        "label": "Spital Lindenhafen"
      },
      "appointmentTime": "16:00",
      "pickupTime": "15:15",
      "returnPlan": "Einwegverlegung mit bestätigter Aufnahme im Zielspital; keine reguläre Rückfahrt. Zielstation und Transportteam sind informiert.",
      "escort": "Qualifiziertes Rettungsdienstteam ist vor Ort und übernimmt medizinische Betreuung/Überwachung sowie die Übergabe an die Zielstation.",
      "condition": "Planbarer Verlegungstransport. Zustand entspricht der vom Behandlungsteam dokumentierten Ausgangslage; im Fall keine akute Verschlechterung. Für diese Fahrt ist eine qualifizierte medizinische Überwachung ausdrücklich angeordnet.",
      "mobility": "Liegende Beförderung gemäss bestätigtem Transportauftrag.",
      "transportOrder": "Liegend mit angeordneter medizinischer Überwachung durch qualifiziertes Rettungsdienstteam. Keine Alleinbegleitung durch Lernende; keine Übertragung medizinischer Aufgaben im Spiel.",
      "requiredVehicleId": "ambulance",
      "vehicleReason": "Der blosse Liegeplatz reicht nicht. Zusätzlich ist qualifizierte medizinische Überwachung angeordnet und durch das vereinbarte Rettungsdienstteam gesichert.",
      "dialogue": [
        {
          "id": "order",
          "question": "Welcher Auftrag liegt für die Fahrt vor?",
          "answer": "Es ist eine geplante Verlegung im Liegen. Das Behandlungsteam hat die medizinische Überwachung durch das Rettungsdienstteam für diese Fahrt ausdrücklich angeordnet."
        },
        {
          "id": "team",
          "question": "Wer übernimmt die Betreuung und Übergabe?",
          "answer": "Das qualifizierte Rettungsdienstteam ist hier. Es übernimmt mich, betreut mich während der Fahrt und übergibt mich auf der vereinbarten Zielstation."
        },
        {
          "id": "preparation",
          "question": "Was soll dem Team mitgegeben werden?",
          "answer": "Bitte den geschlossenen Verlegungsauftrag, die aktuelle freigegebene Medikamentenliste und meine vorbereitete persönliche Tasche mitgeben. Taschentücher dürfen gern mit. Zusätzliche Medikamente bitte nicht selbst zusammenstellen."
        }
      ],
      "packOptions": [
        {
          "id": "transfer",
          "label": "Geschlossener Verlegungsauftrag",
          "status": "required",
          "reason": "Beinhaltet bestätigte Aufnahme, transportrelevanten aktuellen Bericht und vereinbarten Überwachungsauftrag; Übergabe an das zuständige Fachteam."
        },
        {
          "id": "medlist",
          "label": "Aktuelle freigegebene Medikamentenliste",
          "status": "required",
          "reason": "Die empfangende Stelle benötigt die aktuelle Liste; sie begründet keine zusätzliche Medikamentengabe."
        },
        {
          "id": "personalbag",
          "label": "Vorbereitete persönliche Tasche",
          "status": "required",
          "reason": "Mit der Person abgesprochenes persönliches Eigentum für den stationären Aufenthalt."
        },
        {
          "id": "tissues",
          "label": "Taschentücher",
          "status": "optional",
          "reason": "Als persönliche Ergänzung ausdrücklich möglich."
        },
        {
          "id": "fullrecord",
          "label": "Gesamte alte Patientenakte",
          "status": "leave",
          "reason": "Nur auftragsrelevante, berechtigt weitergegebene Unterlagen gehören mit."
        },
        {
          "id": "meds",
          "label": "Selbst zusammengestellte Medikamente",
          "status": "leave",
          "reason": "Keine eigenständige Auswahl, Dosierung oder Übernahme der medizinischen Betreuung."
        }
      ],
      "costs": "Die Administration hat den Kostenweg dieses Verlegungstransports mit der zuständigen Stelle abgestimmt. Keine Prozentwerte oder pauschale Versicherungszusage im Spiel.",
      "handover": [
        {
          "id": "identity",
          "label": "Identität, Ziel und Termin abgleichen",
          "required": true,
          "reason": "Person, Dienst und Auftrag müssen zusammenpassen."
        },
        {
          "id": "mobility",
          "label": "Angeordneten Überwachungsbedarf und Übernahme durch qualifiziertes Rettungsdienstteam bestätigen",
          "required": true,
          "reason": "Die tatsächlich benötigte Unterstützung und das bestätigte Angebot gehören zusammen."
        },
        {
          "id": "documents",
          "label": "Benötigte Unterlagen geschlossen an die berechtigte Ziel- oder Begleitperson übergeben",
          "required": true,
          "reason": "Nur notwendige, berechtigt weitergegebene Informationen aushändigen."
        },
        {
          "id": "return",
          "label": "Bestätigte Aufnahme im Zielspital und Einwegverlegung ohne reguläre Rückfahrt nennen",
          "required": true,
          "reason": "Die vereinbarte Begleitung und der Rückweg beziehungsweise Verlegungsauftrag müssen gesichert sein."
        },
        {
          "id": "private",
          "label": "Private Angaben ohne Bezug zur Fahrt ergänzen",
          "required": false,
          "reason": "Diese Angaben werden für den Transport nicht benötigt."
        }
      ],
      "check": {
        "question": "Was unterscheidet diesen Auftrag vom vorherigen Liegendtransport?",
        "options": [
          {
            "id": "monitoring",
            "label": "Zusätzlich ist qualifizierte medizinische Überwachung angeordnet und personell gesichert"
          },
          {
            "id": "hospital",
            "label": "Jede Fahrt zum Spital benötigt Blaulicht"
          },
          {
            "id": "fast",
            "label": "Das Fahrzeug mit der höchsten Geschwindigkeit ist immer richtig"
          }
        ],
        "correctId": "monitoring",
        "feedback": "Medizinischer Betreuungs-/Überwachungsbedarf und das qualifizierte Team bestimmen den Auftrag. Fahrgeschwindigkeit ist kein Lern- oder Auswahlkriterium."
      },
      "sources": [
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 71–73 Transportwahl",
          "url": "https://app.edubase.ch/#doc/60586/71",
          "status": "Vollständig gelesen durch Edubase-Chat am 27.10.2026; Fundstellen am 25.11.2026 bestätigt. Buchseite = Dokumentseite. Heute keine erneute Lektüre möglich."
        },
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 84–85 Vorbereitung",
          "url": "https://app.edubase.ch/#doc/60586/84",
          "status": "Früher vollständig gelesen; Buchseite = Dokumentseite bestätigt."
        },
        {
          "title": "FaGe Band 9 G/H, 23. Auflage, S. 85–87 Information und Begleitung",
          "url": "https://app.edubase.ch/#doc/60586/85",
          "status": "Früher vollständig gelesen; S. 87 nur oben transportbezogen."
        }
      ],
      "finishReflection": "Nenne den entscheidenden Fallhinweis, zwei begründete Vorbereitungen und eine notwendige Absprache.",
      "roleNote": "Die Fahrsteuerung ist eine abstrahierte Spielmechanik. Im Berufsalltag fahren entsprechend berechtigte Personen; Betreuung, Verladung und Sicherung richten sich nach Auftrag, Qualifikation und betrieblichem Vorgehen.",
      "needsWishConversation": true,
      "bookingStatus": "Dieses konkrete Angebot ist mit zuständiger Stelle, Dienst, Person und nötiger Begleitung für den beschriebenen Auftrag bestätigt. Andere sichtbare Fahrzeuge sind nicht automatisch für diesen Auftrag freigegeben.",
      "vehicleType": "ambulance",
      "dropoff": {
        "id": "hospital",
        "x": 77,
        "z": 54,
        "label": "Spital Lindenhafen"
      }
    }
  ],
  "offers": [
    {
      "id": "taxi",
      "label": "Sitzkombi",
      "short": "Sitzend und selbstständig",
      "offer": "Für diesen fiktiven Auftrag bestätigtes Sitzkombi-Angebot: Sitzplatz und eine kleine Tasche; kein bestätigter Platz für mitgebrachte Rollstühle, auch nicht gefaltet. Keine Hilfe beim Umsetzen und keine pflegerische Begleitung. Das beschreibt dieses Angebot, keine allgemeine Eigenschaft aller Taxis.",
      "qualifiedCrew": false
    },
    {
      "id": "volunteer",
      "label": "Freiwilligen-Fahrdienst",
      "short": "Abgesprochene Unterstützung",
      "offer": "Für diesen Auftrag bestätigtes Angebot: normaler Sitzplatz, Platz für einen gefalteten Rollstuhl und eine Begleitperson. Die benannte Begleitperson übernimmt die vereinbarte Hilfe beim Ein-/Aussteigen. Keine medizinische Überwachung.",
      "qualifiedCrew": false
    },
    {
      "id": "wheelchair",
      "label": "Rollstuhlbus",
      "short": "Im eigenen Rollstuhl",
      "offer": "Für diesen Auftrag bestätigt: Beförderung im eigenen besetzten Rollstuhl, zugänglicher Einstieg und Platz für eine Begleitperson. Das Transportteam übernimmt Verladung und Sicherung nach seinen Vorgaben. Keine medizinische Überwachung.",
      "qualifiedCrew": true
    },
    {
      "id": "lying",
      "label": "Liegendtransporter",
      "short": "Planbar im Liegen",
      "offer": "Für diesen Auftrag bestätigt: Liegeplatz, erforderliche Unterstützung bei Übernahme/Übergabe und Platz für eine Begleitperson. Keine medizinische Überwachung.",
      "qualifiedCrew": true
    },
    {
      "id": "ambulance",
      "label": "Rettungswagen",
      "short": "Qualifiziertes Rettungsdienstteam",
      "offer": "Geplanter Verlegungstransport mit qualifiziertem Rettungsdienstteam, Liegeplatz und der ausdrücklich angeordneten medizinischen Überwachung. Das Fachteam begleitet und verantwortet die Betreuung.",
      "qualifiedCrew": true
    }
  ],
  "locations": {
    "home": {
      "x": -88,
      "z": -52,
      "label": "Pflegezentrum am Quai"
    },
    "residence": {
      "x": -31,
      "z": 54,
      "label": "Wohnen am Park"
    },
    "practice": {
      "x": 24,
      "z": -46,
      "label": "Gesundheitszentrum am Park"
    },
    "hospital": {
      "x": 77,
      "z": 54,
      "label": "Spital Lindenhafen"
    },
    "rehab": {
      "x": -31,
      "z": -52,
      "label": "Rehazentrum Uferblick"
    }
  }
};
