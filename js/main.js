// Global helper functions
function getBreakpoint() {
    // Get the CSS variable value
    const rootStyles = getComputedStyle(document.documentElement);
    const breakpoint = rootStyles.getPropertyValue('--mobile-breakpoint').trim();
    return parseInt(breakpoint);
}

function wrapName(fullName) {
    // Convert "First Middle Last" to "F. Last" 
    const parts = fullName.split(' ');
    if (parts.length === 1) return fullName; // Single name, return as is
    
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const shortName = firstName.charAt(0) + '. ' + lastName;
    
    return `<span class="author-name" data-full-name="${fullName}" data-short-name="${shortName}">${fullName}</span>`;
}

// Enhanced footnote system with click-to-stick functionality
document.addEventListener('DOMContentLoaded', function() {
    let activeMarginNote = null;
    
    // Handle text footnotes
    const footnotes = document.querySelectorAll('.footnote-ref');
    footnotes.forEach(function(footnote) {
        const text = footnote.getAttribute('data-footnote');
        if (text) {
            const marginNote = document.createElement('span');
            marginNote.className = 'margin-note';
            marginNote.textContent = text;
            footnote.parentNode.insertBefore(marginNote, footnote.nextSibling);
            
            // Add click functionality
            footnote.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Hide any currently active margin note
                if (activeMarginNote && activeMarginNote !== marginNote) {
                    activeMarginNote.classList.remove('sticky');
                }
                
                // Toggle this margin note
                if (marginNote.classList.contains('sticky')) {
                    marginNote.classList.remove('sticky');
                    activeMarginNote = null;
                } else {
                    marginNote.classList.add('sticky');
                    activeMarginNote = marginNote;
                }
            });
        }
    });
    
    // Handle image footnotes
    const imageFootnotes = document.querySelectorAll('.image-footnote-ref');
    imageFootnotes.forEach(function(footnote) {
        const imageSrc = footnote.getAttribute('data-image');
        const imageAlt = footnote.getAttribute('data-image-alt') || '';
        const imageCaption = footnote.getAttribute('data-image-caption') || '';
        
        if (imageSrc) {
            const marginImage = document.createElement('span');
            marginImage.className = 'margin-image';
            
            const img = document.createElement('img');
            img.src = imageSrc;
            img.alt = imageAlt;
            marginImage.appendChild(img);
            
            if (imageCaption) {
                const caption = document.createElement('div');
                caption.className = 'image-caption';
                caption.textContent = imageCaption;
                marginImage.appendChild(caption);
            }
            
            footnote.parentNode.insertBefore(marginImage, footnote.nextSibling);
            
            // Add click functionality
            footnote.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Hide any currently active margin note
                if (activeMarginNote && activeMarginNote !== marginImage) {
                    activeMarginNote.classList.remove('sticky');
                }
                
                // Toggle this margin image
                if (marginImage.classList.contains('sticky')) {
                    marginImage.classList.remove('sticky');
                    activeMarginNote = null;
                } else {
                    marginImage.classList.add('sticky');
                    activeMarginNote = marginImage;
                }
            });
        }
    });
    
    // Hide margin notes when clicking elsewhere
    document.addEventListener('click', function(e) {
        if (activeMarginNote && !activeMarginNote.contains(e.target)) {
            activeMarginNote.classList.remove('sticky');
            activeMarginNote = null;
        }
    });
    
    // Name shortening functionality
    function shortenNames() {
        const isNarrowScreen = window.innerWidth <= getBreakpoint();
        const nameElements = document.querySelectorAll('.author-name');
        
        nameElements.forEach(function(element) {
            const fullName = element.getAttribute('data-full-name');
            const shortName = element.getAttribute('data-short-name');
            
            if (fullName && shortName) {
                element.textContent = isNarrowScreen ? shortName : fullName;
            }
        });
    }
    
    // Smart tooltip positioning
    function adjustTooltipPosition() {
        const footnotes = document.querySelectorAll('.footnote-ref, .image-footnote-ref');
        
        footnotes.forEach(function(footnote) {
            const rect = footnote.getBoundingClientRect();
            const windowWidth = window.innerWidth;
            const tooltipWidth = footnote.classList.contains('image-footnote-ref') ? 200 : 250;
            
            // Remove any existing positioning classes
            footnote.classList.remove('tooltip-left', 'tooltip-right', 'tooltip-center');
            
            // Check if tooltip would go off the left edge
            if (rect.left - (tooltipWidth / 2) < 10) {
                footnote.classList.add('tooltip-left');
            }
            // Check if tooltip would go off the right edge
            else if (rect.right + (tooltipWidth / 2) > windowWidth - 10) {
                footnote.classList.add('tooltip-right');
            }
            // Default center positioning
            else {
                footnote.classList.add('tooltip-center');
            }
            
            // Apply positioning to image tooltips
            if (footnote.classList.contains('image-footnote-ref')) {
                const tooltip = footnote.querySelector('.image-tooltip');
                if (tooltip) {
                    if (footnote.classList.contains('tooltip-left')) {
                        tooltip.style.left = '0';
                        tooltip.style.transform = 'translateX(0)';
                    } else if (footnote.classList.contains('tooltip-right')) {
                        tooltip.style.left = 'auto';
                        tooltip.style.right = '0';
                        tooltip.style.transform = 'translateX(0)';
                    } else {
                        tooltip.style.left = '50%';
                        tooltip.style.right = 'auto';
                        tooltip.style.transform = 'translateX(-50%)';
                    }
                }
            }
        });
    }
    
    // Create image tooltips dynamically (only for mobile/tablet)
    function createImageTooltips() {
        // Only create tooltips for screens smaller than 1400px (where margin notes are hidden)
        if (window.innerWidth >= 1400) return;
        
        const imageFootnotes = document.querySelectorAll('.image-footnote-ref');
        
        imageFootnotes.forEach(function(footnote) {
            const imageSrc = footnote.getAttribute('data-image');
            const imageAlt = footnote.getAttribute('data-image-alt') || '';
            
            // Check if tooltip already exists
            const existingTooltip = footnote.querySelector('.image-tooltip');
            if (existingTooltip) {
                return; // Skip if tooltip already exists
            }
            
            if (imageSrc) {
                // Make footnote the positioned parent
                footnote.style.position = 'relative';
                
                // Create tooltip element
                const tooltip = document.createElement('div');
                tooltip.className = 'image-tooltip';
                
                const img = document.createElement('img');
                img.src = imageSrc;
                img.alt = imageAlt;
                img.style.maxWidth = '350px';  // Increased from 200px
                img.style.maxHeight = '250px'; // Increased from 150px
                img.style.width = 'auto';
                img.style.height = 'auto';
                img.style.display = 'block';
                
                if (imageAlt) {
                    const caption = document.createElement('div');
                    caption.textContent = imageAlt;
                    caption.style.fontSize = '12px';
                    caption.style.marginTop = '4px';
                    caption.style.textAlign = 'center';
                    caption.style.color = 'white';
                    tooltip.appendChild(img);
                    tooltip.appendChild(caption);
                } else {
                    tooltip.appendChild(img);
                }
                
                // Position tooltip relative to the footnote
                tooltip.style.position = 'absolute';
                tooltip.style.top = '100%';
                tooltip.style.marginTop = '5px';
                tooltip.style.left = '50%';
                tooltip.style.transform = 'translateX(-50%)';
                tooltip.style.background = 'rgba(0, 0, 0, 0.9)';
                tooltip.style.padding = '8px';
                tooltip.style.borderRadius = '4px';
                tooltip.style.zIndex = '1000';
                tooltip.style.opacity = '0';
                tooltip.style.visibility = 'hidden';
                tooltip.style.transition = 'opacity 0.3s, visibility 0.3s';
                tooltip.style.pointerEvents = 'none';
                // Remove the border line below if you don't want any border
                // tooltip.style.border = '2px solid rgba(255, 255, 255, 0.3)';
                
                // Append tooltip to the footnote itself
                footnote.appendChild(tooltip);
                
                // Add hover events (only for mobile)
                footnote.addEventListener('mouseenter', function() {
                    if (window.innerWidth < 1400) {
                        tooltip.style.opacity = '1';
                        tooltip.style.visibility = 'visible';
                    }
                });
                
                footnote.addEventListener('mouseleave', function() {
                    tooltip.style.opacity = '0';
                    tooltip.style.visibility = 'hidden';
                });
            }
        });
    }
    
    // Remove image tooltips on desktop
    function removeImageTooltips() {
        const tooltips = document.querySelectorAll('.image-tooltip');
        tooltips.forEach(function(tooltip) {
            tooltip.remove();
        });
    }
    
    // Initial calls and event listeners
    shortenNames();
    adjustTooltipPosition();
    createImageTooltips();
    
    window.addEventListener('resize', function() {
        shortenNames();
        adjustTooltipPosition();
        
        // Manage image tooltips based on screen size
        if (window.innerWidth >= 1400) {
            removeImageTooltips(); // Remove tooltips on desktop (margin notes are shown)
        } else {
            createImageTooltips(); // Create tooltips on mobile/tablet
        }
    });
    
    window.addEventListener('scroll', adjustTooltipPosition);
});
