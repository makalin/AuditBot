# AuditBot

AuditBot is a comprehensive file audit and analysis tool designed to help users identify and manage files on their system. It provides insightful statistics, visualizations, and easy-to-use filtering options to efficiently manage and clean up files. The app features an interactive user interface built with modern web technologies and integrates with Electron for desktop capabilities.

## Features

- **File Analysis and Statistics**: Provides details on the total number of files, total size, duplicates found, and potential space savings.
- **Interactive File Type Distribution**: Visual representation of file types using D3.js pie charts.
- **Advanced File Filtering**: Filter files by duplicates, unused files, and cache files.
- **Search Functionality**: Easily search for specific files.
- **File List with Actions**: View file name, size, last accessed date, type, and status.
- **Batch File Cleanup**: Select multiple files and remove them in one click.

## Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/makalin/AuditBot.git
   cd AuditBot
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run the Application**
   ```bash
   npm start
   ```

## Usage

1. Launch the app by running `npm start`.
2. Click the "Start Scan" button to begin file analysis.
3. Use the filtering options to view specific file categories (duplicates, unused files, cache files).
4. View the detailed file list with file size, type, last accessed date, and status.
5. Select files to clean up and click "Clean Selected Files" to remove them.

## Project Structure

```
AuditBot/
|-- frontend-script.js    # Contains the main JavaScript logic for file processing and user interactions.
|-- auditbot-frontend.html # Main HTML structure for the AuditBot user interface.
|-- auditbot-core.js      # Core logic and functions for file scanning, analysis, and data processing.
|-- package.json          # Node.js dependencies and scripts.
|-- README.md             # Project documentation (this file).
```

## Technologies Used

- **Electron**: Desktop app framework for building cross-platform apps with web technologies.
- **Node.js**: Backend logic and file system interactions.
- **Tailwind CSS**: For responsive and modern UI design.
- **D3.js**: For rendering interactive data visualizations (File Type Distribution chart).

## Files and Directories

| File/Directory         | Description                                |
|----------------------|--------------------------------------------|
| `frontend-script.js`  | Handles file actions, user interactions, and utility functions. |
| `auditbot-frontend.html` | Main HTML structure and layout. |
| `auditbot-core.js`    | Core logic for file scanning, analysis, and file system interactions. |

## Key Functions and Methods

### **frontend-script.js**
- **formatSize(bytes)**: Converts file sizes to human-readable format.
- **formatDate(date)**: Converts date to readable format.

### **auditbot-core.js**
- **scanFiles(path)**: Scans the directory for files and returns file details.
- **findDuplicates(files)**: Identifies and returns duplicate files from the scan results.

## How It Works

1. **File Scanning**: AuditBot scans the selected directory for files and collects details like name, size, type, and last accessed date.
2. **Data Visualization**: It generates a File Type Distribution pie chart to give users an overview of file types.
3. **File List Display**: The app displays a searchable, filterable file list.
4. **User Actions**: Users can select files for cleanup and remove them with one click.

## Customization

### **Modify File Filters**
The file filters ("Duplicates", "Unused", and "Cache") can be modified in the `auditbot-core.js` file. You can customize the criteria used to define these file categories.

### **Customize Styles**
All UI elements are styled using Tailwind CSS. Modify the styles directly in the `auditbot-frontend.html` file.

## Contribution
Contributions are welcome! If you want to contribute:

1. Fork the repo.
2. Create a new feature branch.
3. Commit your changes.
4. Create a pull request.

## License
This project is licensed under the MIT License. See the `LICENSE` file for more details.
