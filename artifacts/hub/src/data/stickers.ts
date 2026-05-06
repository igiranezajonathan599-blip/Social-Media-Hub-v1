export interface Sticker {
  id: string;
  emoji: string;
  label: string;
  category: string;
}

export const STICKER_CATEGORIES = [
  "Faces",
  "Hearts",
  "Animals",
  "Food",
  "Nature",
  "Activities",
  "Travel",
  "Objects",
  "Symbols",
  "Celebration",
] as const;

export const STICKERS: Sticker[] = [
  // Faces
  { id: "s1", emoji: "😀", label: "Grinning", category: "Faces" },
  { id: "s2", emoji: "😂", label: "LOL", category: "Faces" },
  { id: "s3", emoji: "🥹", label: "Touched", category: "Faces" },
  { id: "s4", emoji: "😍", label: "Heart Eyes", category: "Faces" },
  { id: "s5", emoji: "🤩", label: "Star Struck", category: "Faces" },
  { id: "s6", emoji: "😎", label: "Cool", category: "Faces" },
  { id: "s7", emoji: "🤔", label: "Thinking", category: "Faces" },
  { id: "s8", emoji: "😤", label: "Determined", category: "Faces" },
  { id: "s9", emoji: "😭", label: "Sobbing", category: "Faces" },
  { id: "s10", emoji: "😱", label: "Shocked", category: "Faces" },
  { id: "s11", emoji: "🥳", label: "Party", category: "Faces" },
  { id: "s12", emoji: "😴", label: "Sleepy", category: "Faces" },

  // Hearts
  { id: "s13", emoji: "❤️", label: "Red Heart", category: "Hearts" },
  { id: "s14", emoji: "🧡", label: "Orange Heart", category: "Hearts" },
  { id: "s15", emoji: "💛", label: "Yellow Heart", category: "Hearts" },
  { id: "s16", emoji: "💚", label: "Green Heart", category: "Hearts" },
  { id: "s17", emoji: "💙", label: "Blue Heart", category: "Hearts" },
  { id: "s18", emoji: "💜", label: "Purple Heart", category: "Hearts" },
  { id: "s19", emoji: "🖤", label: "Black Heart", category: "Hearts" },
  { id: "s20", emoji: "💖", label: "Sparkling Heart", category: "Hearts" },
  { id: "s21", emoji: "💘", label: "Heart Arrow", category: "Hearts" },
  { id: "s22", emoji: "💔", label: "Broken Heart", category: "Hearts" },
  { id: "s23", emoji: "🫀", label: "Anatomical Heart", category: "Hearts" },
  { id: "s24", emoji: "💝", label: "Gift Heart", category: "Hearts" },

  // Animals
  { id: "s25", emoji: "🐶", label: "Dog", category: "Animals" },
  { id: "s26", emoji: "🐱", label: "Cat", category: "Animals" },
  { id: "s27", emoji: "🐼", label: "Panda", category: "Animals" },
  { id: "s28", emoji: "🦊", label: "Fox", category: "Animals" },
  { id: "s29", emoji: "🐸", label: "Frog", category: "Animals" },
  { id: "s30", emoji: "🦁", label: "Lion", category: "Animals" },
  { id: "s31", emoji: "🐨", label: "Koala", category: "Animals" },
  { id: "s32", emoji: "🐧", label: "Penguin", category: "Animals" },
  { id: "s33", emoji: "🦋", label: "Butterfly", category: "Animals" },
  { id: "s34", emoji: "🐬", label: "Dolphin", category: "Animals" },
  { id: "s35", emoji: "🦄", label: "Unicorn", category: "Animals" },
  { id: "s36", emoji: "🐙", label: "Octopus", category: "Animals" },

  // Food
  { id: "s37", emoji: "🍕", label: "Pizza", category: "Food" },
  { id: "s38", emoji: "🍔", label: "Burger", category: "Food" },
  { id: "s39", emoji: "🍜", label: "Noodles", category: "Food" },
  { id: "s40", emoji: "🍣", label: "Sushi", category: "Food" },
  { id: "s41", emoji: "🍦", label: "Ice Cream", category: "Food" },
  { id: "s42", emoji: "🎂", label: "Birthday Cake", category: "Food" },
  { id: "s43", emoji: "🍰", label: "Shortcake", category: "Food" },
  { id: "s44", emoji: "🧁", label: "Cupcake", category: "Food" },
  { id: "s45", emoji: "☕", label: "Coffee", category: "Food" },
  { id: "s46", emoji: "🧋", label: "Bubble Tea", category: "Food" },
  { id: "s47", emoji: "🍓", label: "Strawberry", category: "Food" },
  { id: "s48", emoji: "🍉", label: "Watermelon", category: "Food" },

  // Nature
  { id: "s49", emoji: "🌸", label: "Cherry Blossom", category: "Nature" },
  { id: "s50", emoji: "🌺", label: "Hibiscus", category: "Nature" },
  { id: "s51", emoji: "🌻", label: "Sunflower", category: "Nature" },
  { id: "s52", emoji: "🌈", label: "Rainbow", category: "Nature" },
  { id: "s53", emoji: "⭐", label: "Star", category: "Nature" },
  { id: "s54", emoji: "🌙", label: "Moon", category: "Nature" },
  { id: "s55", emoji: "☀️", label: "Sun", category: "Nature" },
  { id: "s56", emoji: "❄️", label: "Snowflake", category: "Nature" },
  { id: "s57", emoji: "⚡", label: "Lightning", category: "Nature" },
  { id: "s58", emoji: "🌊", label: "Wave", category: "Nature" },
  { id: "s59", emoji: "🍃", label: "Leaf", category: "Nature" },
  { id: "s60", emoji: "🌴", label: "Palm Tree", category: "Nature" },

  // Activities
  { id: "s61", emoji: "⚽", label: "Soccer", category: "Activities" },
  { id: "s62", emoji: "🏀", label: "Basketball", category: "Activities" },
  { id: "s63", emoji: "🎮", label: "Video Game", category: "Activities" },
  { id: "s64", emoji: "🎵", label: "Music", category: "Activities" },
  { id: "s65", emoji: "🎨", label: "Art", category: "Activities" },
  { id: "s66", emoji: "📚", label: "Books", category: "Activities" },
  { id: "s67", emoji: "🎤", label: "Mic", category: "Activities" },
  { id: "s68", emoji: "🎸", label: "Guitar", category: "Activities" },
  { id: "s69", emoji: "🏋️", label: "Gym", category: "Activities" },
  { id: "s70", emoji: "🧘", label: "Yoga", category: "Activities" },
  { id: "s71", emoji: "🎭", label: "Theater", category: "Activities" },
  { id: "s72", emoji: "🎯", label: "Target", category: "Activities" },

  // Travel
  { id: "s73", emoji: "✈️", label: "Airplane", category: "Travel" },
  { id: "s74", emoji: "🚀", label: "Rocket", category: "Travel" },
  { id: "s75", emoji: "🏖️", label: "Beach", category: "Travel" },
  { id: "s76", emoji: "🏔️", label: "Mountain", category: "Travel" },
  { id: "s77", emoji: "🗺️", label: "Map", category: "Travel" },
  { id: "s78", emoji: "🏝️", label: "Island", category: "Travel" },
  { id: "s79", emoji: "🌍", label: "Earth", category: "Travel" },
  { id: "s80", emoji: "🗼", label: "Eiffel", category: "Travel" },
  { id: "s81", emoji: "🏕️", label: "Camping", category: "Travel" },
  { id: "s82", emoji: "🚂", label: "Train", category: "Travel" },
  { id: "s83", emoji: "🛳️", label: "Cruise", category: "Travel" },
  { id: "s84", emoji: "🌆", label: "City", category: "Travel" },

  // Objects
  { id: "s85", emoji: "💡", label: "Idea", category: "Objects" },
  { id: "s86", emoji: "📱", label: "Phone", category: "Objects" },
  { id: "s87", emoji: "💻", label: "Laptop", category: "Objects" },
  { id: "s88", emoji: "📷", label: "Camera", category: "Objects" },
  { id: "s89", emoji: "🎁", label: "Gift", category: "Objects" },
  { id: "s90", emoji: "🔑", label: "Key", category: "Objects" },
  { id: "s91", emoji: "💎", label: "Diamond", category: "Objects" },
  { id: "s92", emoji: "🏆", label: "Trophy", category: "Objects" },

  // Symbols
  { id: "s93", emoji: "✅", label: "Check", category: "Symbols" },
  { id: "s94", emoji: "❌", label: "Cross", category: "Symbols" },
  { id: "s95", emoji: "🔥", label: "Fire", category: "Symbols" },
  { id: "s96", emoji: "💯", label: "100", category: "Symbols" },

  // Celebration
  { id: "s97", emoji: "🎉", label: "Party", category: "Celebration" },
  { id: "s98", emoji: "🥂", label: "Cheers", category: "Celebration" },
  { id: "s99", emoji: "🎊", label: "Confetti", category: "Celebration" },
  { id: "s100", emoji: "🪄", label: "Magic", category: "Celebration" },
];
