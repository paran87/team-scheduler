const PLACE_IMAGES: Record<string, string> = {
  "Lingayen, San Jacinto":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Capitol_Building_Lingayen_Front_View.jpg/1280px-Capitol_Building_Lingayen_Front_View.jpg",
  "Trece - Reloc":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Cavite_Capitol_2026.jpg/1280px-Cavite_Capitol_2026.jpg",
  Bataan:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Bataan_Capitol_2022.jpg/1280px-Bataan_Capitol_2022.jpg",
  "Pola, Mindoro":
    "https://upload.wikimedia.org/wikipedia/commons/3/37/Beach_North_Mindoro_Philippines.jpg",
  Benguet:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Mt._Pulag_-_9.jpg/1280px-Mt._Pulag_-_9.jpg",
  Apayao:
    "https://upload.wikimedia.org/wikipedia/commons/6/62/Dibagat_river.JPG",
  "Sta. Cruz":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Santa_Cruz_Town_Hall%2C_Laguna%2C_Dec_2023.jpg/1280px-Santa_Cruz_Town_Hall%2C_Laguna%2C_Dec_2023.jpg",
  Cavite:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/AguinaldoShrinejf0944_13.JPG/1280px-AguinaldoShrinejf0944_13.JPG",
  Lucena:
    "https://upload.wikimedia.org/wikipedia/commons/2/27/New_Lucena_City_Hall.jpg",
  "San Narciso":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/San_Narciso_Church%2C_Zambales%2C_Aug_2025_%281%29.jpg/1280px-San_Narciso_Church%2C_Zambales%2C_Aug_2025_%281%29.jpg",
  "Bato, Catanduanes":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Catanduanes_2.jpg/1280px-Catanduanes_2.jpg",
  Zamboanga:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/Zamboanga_City_Hall_%26_Rizal_Park%2C_Mar_2026.jpg/1280px-Zamboanga_City_Hall_%26_Rizal_Park%2C_Mar_2026.jpg",
  "Tagoloan, Mis. Or.":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Mount_Balatukan1.JPG/1280px-Mount_Balatukan1.JPG",
  Cabanatuan:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ed/General_Antonio_Luna_Monument%2C_Cabanatuan%2C_Nueva_Ecija%2C_April_2023.jpg/1280px-General_Antonio_Luna_Monument%2C_Cabanatuan%2C_Nueva_Ecija%2C_April_2023.jpg",
  "Botolan, Zambales":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2d/Boat_Ride_View_going_to_Nagsasa_Cove.jpg/1280px-Boat_Ride_View_going_to_Nagsasa_Cove.jpg",
  "Santa Rosa, Biñan, San Pedro":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Santa_Rosa_Arch%2C_Laguna%2C_Jul_2024_%282%29.jpg/1280px-Santa_Rosa_Arch%2C_Laguna%2C_Jul_2024_%282%29.jpg",
  "Ilocos Norte & Sur":
    "https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Paoay_Church_and_Bell_Tower.jpg/1280px-Paoay_Church_and_Bell_Tower.jpg",
};

export function getPlaceImage(place?: string) {
  if (!place) return undefined;
  return PLACE_IMAGES[place];
}
