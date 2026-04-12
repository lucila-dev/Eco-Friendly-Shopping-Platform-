# Eco Friendly Shopping Platform

**EcoShop** is a web application that connects people with sustainable and eco-friendly products. The platform helps users make informed choices by showing each product’s environmental impact and lets them track their own “green impact” over time.

## What it does

The site works like a small online shop focused on sustainability. Users can browse a catalogue of eco-friendly products, see how each one scores on sustainability, what materials it uses, and how much carbon footprint it saves compared to conventional options. They can add items to a cart, go through a mock checkout, and review their order history. Logged-in users get a personal dashboard that summarises their orders and their total estimated carbon savings.

## Main features

- **Product catalogue** · Browse products by category. Each product shows its name, price, image, and sustainability score. You can search by name and filter by category, price range, and minimum sustainability score.
- **Product details & sustainability** · Every product page shows a sustainability score (out of 10), the materials used, and the estimated carbon footprint saving (e.g. kg CO₂ saved). This information is presented clearly to support buying decisions.
- **Reviews and ratings** · Logged-in users can leave a star rating and an optional written review. Product pages display all reviews and an average rating.
- **Shopping cart and checkout** · Users can add items to a cart, change quantities, remove items, and see the total price. A mock checkout collects shipping details and (mock) card information and shows a confirmation message when the “order” is placed. No real payment is processed.
- **User accounts** · Sign up and sign in with email and password, log out, and reset password via email. The interface includes clear options to create an account or log in.
- **Dashboard and green impact** · Each user has a dashboard with their profile details, order history, and a summary of their cumulative environmental impact (total estimated CO₂ saved) based on the products they’ve “purchased”.
- **Developer/owner product management** · Owners, developers, and admins can add, edit, and remove products and manage sustainability data (materials, score, carbon saving) so the catalogue stays up to date.

The design is responsive and works on desktop and mobile, with a simple layout and green-themed styling to match the sustainability focus.

## Tech stack

- **Frontend:** React (Vite), React Router, Tailwind CSS  
- **Backend & data:** Supabase (PostgreSQL, Auth, optional Storage for images)

Setup and run instructions are in the repository; clone the repo and follow the configuration steps for your own Supabase project and environment variables.
