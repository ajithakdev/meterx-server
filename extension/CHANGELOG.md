# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2024-08-28

This is a major update, featuring a complete rebranding, significant new features, and a major technical overhaul for better performance and maintainability.

### 🚀 New Features

-   **Test Depth Selection**: Users can now select the size of the test file (1MB, 10MB, or 25MB) directly from the popup. This provides greater flexibility and allows for more accurate speed measurements, especially on very fast or very slow connections.
-   **Test History**: The popup now displays a history of the last 10 speed tests performed. This allows users to easily track their internet performance over time without leaving the extension.

### 🎨 UI & UX Enhancements

-   **Complete Rebranding**: The extension has been rebranded from "MeterX" to **"NetPulse Pro"**.
-   **Redesigned Interface**: The user interface has been completely redesigned with a modern, clean, and more engaging look. This includes new icons and fun, space-themed doodles to enhance the user experience.
-   **Improved Status Updates**: Status messages during the test are now more descriptive, creative, and informative, keeping the user engaged throughout the testing process.
-   **Loading Indicator**: A visual spinner is now displayed while a test is in progress, providing clear visual feedback that the extension is working.

### 🛠️ Technical Improvements

-   **Codebase Refactor to TypeScript**: The entire frontend logic for the popup has been migrated from JavaScript to TypeScript. This enhances code quality, maintainability, and developer experience through static typing.
-   **Robust Error Handling**: Error handling has been significantly improved to catch and display more user-friendly messages if a test fails, providing better insight into what went wrong.
-   **Dynamic Test Configuration**: The background service can now dynamically configure tests based on user selections from the popup, such as the chosen test file size.