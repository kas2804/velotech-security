# UI/UX Design Specification: Futuristic Secure Login

**Project:** Secure Authentication Portal 
**Theme:** Cyber-Minimalism (Dark Mode + Neon Accents)
**Vibe:** Professional, Secure, Futuristic, Smooth

## 1. Color Palette

The goal here is high contrast to ensure readability, using a deep, unsaturated background so the neon elements "pop" without overwhelming the eyes.

| Element | Hex Code | Description |
| :--- | :--- | :--- |
| **Background (Base)** | `#0D1117` | A very deep blue-gray (almost black) to absorb light and reduce eye strain. |
| **Card / Container** | `#161B22` | Slightly lighter than the base to create depth for the login box. |
| **Primary Accent (Neon)**| `#00FF9D` | A vibrant "Cyber Green" for the main action button (Login) to signify success/security. |
| **Secondary Accent** | `#00E5FF` | A soft "Electric Blue" for hover states, links, and the subtle background glow. |
| **Text (Primary)** | `#E6EDF3` | Off-white for crisp readability on dark backgrounds. |
| **Text (Muted)** | `#8B949E` | Gray for placeholders, secondary text, and labels. |

## 2. Typography

Keep it clean and highly legible. A sans-serif geometric font works best for futuristic interfaces.
*   **Primary Font:** `Inter` or `Roboto` (Available free on Google Fonts).
*   **Headings:** Bold (700 weight), tracking slightly tight.
*   **Input Text:** Regular (400 weight), tracking normal for readability.

## 3. Layout & Core Components

To achieve the "minimalist" and "elegant" feel, we will use **Glassmorphism** (frosted glass effect) combined with ample negative space.

*   **The Background:** Instead of a flat color, use a very subtle radial gradient in the background (e.g., a faint glow of `#00E5FF` in the top left corner fading into the `#0D1117` base).
*   **The Login Card:**
    *   Centered on the screen.
    *   Border: A 1px solid border with low opacity (e.g., `rgba(255, 255, 255, 0.1)`).
    *   Backdrop Filter: `blur(10px)` to give it that frosted glass look if overlapping the background glow.
    *   Shadow: A soft, wide drop shadow `box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3)`.
*   **Input Fields (Username/Password/MFA):**
    *   No hard, bright borders.
    *   Background: Darker than the card (`#090C10`).
    *   Focus State: When the user clicks to type, the bottom border or full border glows softly with the primary neon accent (`#00FF9D`), and the placeholder text floats smoothly to the top.
*   **The Login Button:**
    *   Full width of the card.
    *   Background: A subtle gradient of the primary accent.
    *   Hover State: The button should emit a soft "glow" (using `box-shadow`) when the mouse hovers over it.

## 4. Animations & Interactions

Smoothness comes from micro-interactions. Nothing should snap instantly; everything should fade or slide.

*   **Page Load:** The login card fades in (`opacity: 0` to `1`) while sliding up slightly (`translateY(20px)` to `0`) over 0.6 seconds using an `ease-out` curve.
*   **Input Focus:** 0.3-second transition for the border color change and placeholder movement.
*   **MFA Transition (Crucial):** When the user enters their password correctly, do *not* abruptly load a new page. Instead, smoothly cross-fade the username/password inputs out, and fade the 6-digit MFA input field in within the *same* card.

## 5. Security-Specific UX Features

*   **Password Toggle:** An "eye" icon inside the password field to toggle visibility. 
*   **Feedback Loops:** 
    *   If the login fails (e.g., on the vulnerable demo), the input fields should briefly shake side-to-side (a classic "deny" animation) and turn a soft neon red (`#FF453A`).
    *   If successful, a subtle green checkmark or glowing loader should appear before transitioning to the dashboard.