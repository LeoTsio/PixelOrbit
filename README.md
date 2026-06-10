# PixelOrbit

A live pixel-art universe powered by real NASA data.

PixelOrbit transforms satellites, telescopes, rovers, and spacecraft into interactive pixel-art characters that display real mission insights and telemetry.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Current Progress

### Pixelator

The first utility developed for PixelOrbit.

Given an image from the internet or a local file, the Pixelator automatically:

* Removes the background
* Isolates the spacecraft
* Converts it into pixel art
* Exports a transparent PNG ready for the website

### Live Spacecraft Data

Currently implemented:

#### International Space Station (ISS)

* Real-time altitude
* Real-time velocity
* Current location
* Crew count
* Crew names

#### Hubble Space Telescope

* Real-time altitude
* Real-time velocity
* Current location

### Dynamic Architecture

PixelOrbit uses a provider-based architecture.

Each spacecraft has its own provider responsible for fetching and processing mission-specific data.

Example:

* providers/iss.js
* providers/hubble.js

This allows new spacecraft to be added without modifying the website itself.

## Planned Missions

* International Space Station (ISS)
* Hubble Space Telescope
* James Webb Space Telescope (JWST)
* Voyager 1
* Voyager 2
* Perseverance 

## Vision

Most space websites show raw telemetry.

PixelOrbit focuses on turning that telemetry into understandable and interactive insights.

Instead of displaying:

Altitude: 540 km

PixelOrbit aims to answer:

What does 540 km actually mean?

Through animations, visualizations, and pixel-art interactions.

## Installation

```bash
git clone https://github.com/LeoTsio/PixelOrbit.git
cd PixelOrbit

/usr/local/bin/python3.11 -m venv .venv311
source .venv311/bin/activate

pip install -r requirements.txt
```

## License

MIT License
