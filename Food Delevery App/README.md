# Food Delivery App

## Project Overview

A responsive frontend food delivery web application developed to demonstrate frontend development, JavaScript logic, UI/UX design, responsive design, localStorage-based state management, and multi-page navigation.

## Features

- Responsive homepage
- Restaurant browsing
- Food categories
- Search
- Food listing
- Restaurant listing
- Add to cart
- Cart management
- Quantity management
- Price calculation
- Discounts/offers
- Checkout
- Payment method selection UI
- Order placement simulation
- Order history
- Cancel order UI
- User profile
- Frontend authentication demonstration if implemented
- localStorage data persistence
- Responsive mobile/tablet/desktop layout

## Technologies

- HTML5
- CSS3
- JavaScript
- JSON
- LocalStorage
- VS Code
- Git
- GitHub

## Project Structure

The project uses a static frontend structure with these main folders and files:

- `index.html` — app entry page with redirect to the main home screen
- `pages/` — HTML pages for home, restaurants, restaurant details, cart, checkout, orders, login, register, profile, and order views
- `css/` — shared and page-specific stylesheets
- `js/` — frontend logic for app initialization, cart, checkout, auth, order tracking, and UI rendering
- `data/` — JSON data for categories, restaurants, foods, offers, users, orders, and app settings
- `assets/` — static visual assets and SVG placeholders

## How to Run

1. Download or clone the repository.
2. Open the project in VS Code.
3. Install the Live Server extension if needed.
4. Open the root `index.html` or use Live Server on the project folder.
5. Visit the served app in the browser.

Example local URL:

http://127.0.0.1:5500/

Do not connect a backend service.

## Frontend Architecture

This app follows a simple static frontend flow:

HTML
↓
CSS
↓
JavaScript
↓
JSON / localStorage

The HTML files provide the page structure, the CSS handles styling and responsive layout, JavaScript renders app state and user interactions, and JSON/localStorage store the demo data and cart/order/user state used by the interface.

## Important Note

This project currently uses frontend-only simulated data and localStorage. No real backend, database, authentication server, or payment gateway is connected.

## Future Improvements

- Backend API
- Database
- Real authentication
- Restaurant admin dashboard
- Real payment gateway
- Real-time order tracking
- Delivery partner application

These are future improvements only.
