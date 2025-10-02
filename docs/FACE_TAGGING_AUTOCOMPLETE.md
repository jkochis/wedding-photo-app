# Face Tagging Autocomplete Feature

## Overview
The wedding photo app now includes an intelligent autocomplete system for face tagging. When users click on detected faces to tag people, they'll see a modern modal with autocomplete suggestions based on existing names in the photo collection.

## Features

### 🎯 **Smart Autocomplete**
- **Real-time filtering** - Suggestions appear as you type
- **Existing name suggestions** - Shows people already tagged in other photos
- **Photo count display** - Shows how many photos each person appears in
- **Case-insensitive search** - Finds names regardless of capitalization
- **New name support** - Allows adding new people not seen before

### 🎨 **Modern UI**
- **Modal dialog** - Clean overlay interface
- **Keyboard navigation** - Use arrow keys to select suggestions
- **Touch friendly** - Optimized for mobile devices
- **Visual feedback** - Clear indication of existing vs new people

### ⚡ **Smart Features**
- **Relevance sorting** - Names starting with your input appear first
- **Limited suggestions** - Shows up to 8 most relevant suggestions
- **Photo statistics** - Displays "3 photos" next to existing people
- **Cancel support** - Easy to cancel with Escape key or Cancel button

## How It Works

### For Users:
1. **Detect faces** - Click "🧑‍🤝‍🧑 Detect People" button on a photo
2. **Click a face** - Tap on any detected face box
3. **Type a name** - Start typing the person's name
4. **See suggestions** - Existing names appear automatically
5. **Select or type new** - Choose from suggestions or add a new person

### For Developers:
The autocomplete system consists of two main components:

1. **AutocompleteInput** (`src/frontend/autocomplete.ts`)
   - Reusable autocomplete component
   - Modal-based UI with keyboard navigation
   - Configurable options and callbacks

2. **Face Detection Integration** (`src/frontend/face-detection.ts`)
   - Replaces simple `prompt()` with rich autocomplete
   - Provides existing names and photo counts
   - Handles new vs existing person logic

## Technical Implementation

### Autocomplete Component
```typescript
const autocomplete = new AutocompleteInput(existingPeople, {
    placeholder: 'Enter person\'s name...',
    minLength: 1,
    maxSuggestions: 8,
    caseSensitive: false,
    allowNew: true,
    getPersonPhotoCount: (personName: string) => this.getPersonPhotoCount(personName)
});

const result = await autocomplete.show();
```

### Integration with Face Detection
```typescript
// Get existing people for suggestions
const existingPeople = this.getAllPeopleNames();

// Show autocomplete with real photo counts
const result = await autocomplete.show();

if (result.value) {
    // Handle the tagging with feedback for new vs existing
    if (result.isNew) {
        log.info('Adding new person to wedding photos');
    } else {
        log.info('Tagging with existing person');
    }
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `placeholder` | string | "Enter name..." | Input placeholder text |
| `minLength` | number | 1 | Minimum characters before showing suggestions |
| `maxSuggestions` | number | 8 | Maximum suggestions to display |
| `caseSensitive` | boolean | false | Whether search is case sensitive |
| `allowNew` | boolean | true | Allow adding new names |
| `getPersonPhotoCount` | function | undefined | Function to get photo count for a person |

## UI Components

### Modal Structure
```
┌─────────────────────────────────────┐
│ Who is this person?                 │
├─────────────────────────────────────┤
│ [Enter person's name...         ] │
│ ┌─────────────────────────────────┐ │
│ │ 👤 Alice Johnson    3 photos   │ │
│ │ 👤 Bob Smith        1 photo    │ │
│ │ 👤 Carol Davis      5 photos   │ │
│ └─────────────────────────────────┘ │
│                    [Cancel] [Add]   │
└─────────────────────────────────────┘
```

### Keyboard Navigation
- **↑/↓ Arrow keys** - Navigate suggestions
- **Enter** - Select highlighted suggestion or confirm input
- **Escape** - Cancel and close
- **Type** - Filter suggestions in real-time

## Benefits

### For Wedding Guests:
- **Faster tagging** - No need to retype names
- **Consistent naming** - Reduces "John", "john", "John Smith" variations
- **Visual feedback** - See who's already been tagged
- **Mobile optimized** - Easy to use on phones

### For Wedding Hosts:
- **Better organization** - Consistent people names across photos
- **Automatic suggestions** - Guests see existing names
- **Comprehensive tagging** - Easier to tag everyone properly
- **Data quality** - Reduces duplicate/inconsistent entries

## Future Enhancements

- **Recent names** - Prioritize recently used names
- **Fuzzy matching** - Handle typos and partial matches
- **Face recognition** - Auto-suggest based on face similarity
- **Bulk tagging** - Tag multiple faces with same person
- **Name aliases** - Support nicknames and full names
- **Group suggestions** - Suggest "Wedding Party", "Family" etc.

## Browser Compatibility

- ✅ Chrome/Edge 88+
- ✅ Safari 14+
- ✅ Firefox 85+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

- **TypeScript** - Type safety and modern JavaScript features
- **Face API** - Face detection (external CDN)
- **CSS Animations** - Smooth modal transitions
- **Event Handling** - Keyboard and touch navigation

## Testing

The autocomplete system can be tested by:

1. **Upload photos** with people
2. **Tag some faces** with names like "Alice", "Bob", "Carol"
3. **Upload more photos** with the same people
4. **Try face detection** - you should see autocomplete suggestions
5. **Test keyboard navigation** - arrow keys, enter, escape
6. **Test mobile** - touch interactions and virtual keyboard

## Performance

- **Lazy loading** - Autocomplete loads only when needed
- **Efficient filtering** - Quick string matching algorithms
- **Memory efficient** - Cleans up DOM elements when closed
- **No external dependencies** - Pure TypeScript implementation

---

This feature significantly improves the user experience for face tagging while maintaining the app's mobile-first design and performance characteristics.