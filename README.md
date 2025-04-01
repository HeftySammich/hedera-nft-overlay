# Overlayz - Hedera NFT Overlay Tool

Overlayz is a dApp for Hedera that allows users to apply overlays and accessories to their NFTs. It's designed to work within the HashPack wallet app and uses the Hedera Mirror Node API to fetch NFT data.

## Features

- HashPack wallet integration
- View NFT collections you own
- Search any Hedera NFT by token ID
- Apply overlays like hats, glasses, and accessories to NFTs
- Adjust overlay position, size, and rotation
- Save modified NFT images
- Responsive design that works in HashPack's dApp browser

## Setup

1. **Clone the repository**
   ```
   git clone https://github.com/yourusername/overlayz.git
   cd overlayz
   ```

2. **Install dependencies**
   ```
   npm install
   ```

3. **Add overlay images**
   - Place your overlay images in the appropriate folders:
     - `/assets/overlays/hats/`
     - `/assets/overlays/glasses/`
     - `/assets/overlays/accessories/`

4. **Configure your Adobe Fonts (optional)**
   - Replace `YOUR_ADOBE_FONTS_KIT_ID` in index.html with your actual kit ID
   - Or replace the font with another of your choice

5. **Start the development server**
   ```
   npm run dev
   ```

6. **Build for production**
   ```
   npm run build
   ```

## Technical Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Wallet Integration**: HashPack via HashConnect
- **Blockchain**: Hedera (HBAR)
- **API**: Hedera Mirror Node
- **Image Manipulation**: HTML5 Canvas

## How It Works

1. **Connect Wallet**: Users connect their HashPack wallet to access their NFTs.
2. **Select NFT**: Users can view their collections and select an NFT to modify.
3. **Apply Overlays**: Choose from various categories of overlays.
4. **Customize**: Adjust the position and size of overlays to perfect the look.
5. **Save**: Download the modified NFT image.

## For HashPack Integration

To list this dApp in HashPack's dApp section:

1. Host the application on a public web server or service like GitHub Pages
2. Submit your dApp information to HashPack through their developer portal

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

- Inspired by [coine.io/overlay-builder](https://coine.io/overlay-builder)
- Created for the Hedera ecosystem
- Shout out to Spaghettaaay.ħ whose initial idea brought this to life
