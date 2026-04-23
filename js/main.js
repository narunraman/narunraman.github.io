// Global helper functions
function getBreakpoint() {
    // Get the CSS variable value
    const rootStyles = getComputedStyle(document.documentElement);
    const breakpoint = rootStyles.getPropertyValue('--mobile-breakpoint').trim();
    return parseInt(breakpoint);
}

// Enhanced footnote system with click-to-stick functionality
document.addEventListener('DOMContentLoaded', function() {
    let activeMarginNote = null;
    let bibtexLibraryPromise = null;
    const publicationDataUrl = '/assets/publications/publications.json';
    const publicationAuthorsUrl = '/assets/publications/authors.json';
    const publicationBibliographyUrl = '/assets/publications/bibliography.bib';
    const linkKindClasses = {
        aaai: 'aaai-link',
        arxiv: 'arxiv-link',
        dna: 'dna-link',
        doi: 'doi-link',
        html: 'html-link',
        huggingface: 'huggingface-link',
        icml: 'icml-link',
        neurips: 'neurips-link',
        pdf: 'pdf-link',
        poster: 'pdf-link',
        software: 'software-link',
        slides: 'slides-link',
        'springer-nature': 'springer-nature-link'
    };

    function initializeProfilePills() {
        const pillTemplate = document.getElementById('profile-pill-template');
        const pillTargets = document.querySelectorAll('[data-pill-target]');

        if (!pillTemplate || pillTargets.length === 0) return;

        pillTargets.forEach(function(target) {
            target.replaceChildren(pillTemplate.content.cloneNode(true));
        });
    }

    function getPublicationTypeLabel(type) {
        if (type === 'conference') return 'Conference';
        if (type === 'journal') return 'Journal';
        return 'Informal';
    }

    function getShortAuthorName(fullName) {
        const parts = fullName.trim().split(/\s+/);
        if (parts.length <= 1) return fullName;
        return `${parts[0].charAt(0)}. ${parts[parts.length - 1]}`;
    }

    async function loadJson(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status}`);
        }
        return response.json();
    }

    function appendText(parent, text) {
        parent.appendChild(document.createTextNode(text));
    }

    function getAuthorRecord(authorEntry) {
        if (typeof authorEntry === 'string') {
            return {
                id: authorEntry
            };
        }

        return authorEntry || {};
    }

    function updateAuthorDisplay(authorElement, useShortName) {
        const text = useShortName ? authorElement.dataset.shortName : authorElement.dataset.fullName;

        authorElement.replaceChildren(document.createTextNode(text));

        if (authorElement.dataset.equalContribution === 'true') {
            const marker = document.createElement('sup');
            marker.className = 'author-marker';
            marker.textContent = '=';
            marker.title = 'Equal contribution';
            marker.setAttribute('aria-label', 'equal contribution');
            authorElement.appendChild(marker);
        }
    }

    function createAuthorElement(authorEntry, authors) {
        const authorRecord = getAuthorRecord(authorEntry);
        const author = authors[authorRecord.id];
        const fullName = author ? author.full : authorRecord.id;
        const shortName = author && author.short ? author.short : getShortAuthorName(fullName);
        const authorElement = document.createElement('span');

        if (!author) {
            console.warn(`Missing author metadata for ${authorRecord.id}`);
        }

        authorElement.className = 'author-name';
        authorElement.dataset.fullName = fullName;
        authorElement.dataset.shortName = shortName;
        if (authorRecord.equalContribution) {
            authorElement.dataset.equalContribution = 'true';
        }

        updateAuthorDisplay(authorElement, false);

        return authorElement;
    }

    function createPublicationLinks(links) {
        if (!links || links.length === 0) return null;

        const linkList = document.createElement('ul');
        linkList.className = 'horizontal-links';

        links.forEach(function(link) {
            const item = document.createElement('li');
            const anchor = document.createElement('a');
            const label = document.createElement('span');
            const iconClass = linkKindClasses[link.kind] || `${link.kind}-link`;

            anchor.href = link.href;
            anchor.className = `icon-link ${iconClass}`;

            label.className = 'link-text';
            label.textContent = link.label;

            anchor.appendChild(label);
            item.appendChild(anchor);
            linkList.appendChild(item);
        });

        return linkList;
    }

    function createPublicationItem(publication, authors) {
        const item = document.createElement('li');
        const entry = document.createElement('div');
        const meta = document.createElement('div');
        const badge = document.createElement('span');
        const copyButton = document.createElement('button');
        const content = document.createElement('div');
        const title = document.createElement('strong');
        const venue = document.createElement('span');
        const links = createPublicationLinks(publication.links);

        item.className = 'publication-item';
        item.id = publication.id;
        item.dataset.publicationId = publication.id;
        item.dataset.publicationType = publication.type || 'informal';
        if (publication.bibtexKey) {
            item.dataset.bibtexKey = publication.bibtexKey;
        }

        entry.className = 'publication-entry';
        meta.className = 'publication-meta';
        badge.className = 'publication-badge';

        copyButton.className = 'publication-copy-button';
        copyButton.type = 'button';
        copyButton.title = 'Copy BibTeX';
        copyButton.setAttribute('aria-label', 'Copy BibTeX');
        copyButton.textContent = 'cite';
        copyButton.hidden = true;

        content.className = 'publication-content';
        title.textContent = publication.title;

        content.appendChild(title);
        appendText(content, ' ');

        publication.authors.forEach(function(authorId, index) {
            if (index > 0) {
                appendText(content, ', ');
            }
            content.appendChild(createAuthorElement(authorId, authors));
        });

        appendText(content, '. ');

        if (publication.venuePrefix) {
            appendText(content, `${publication.venuePrefix} `);
        }

        venue.className = 'cmu-serif-italic';
        venue.textContent = publication.venue;
        content.appendChild(venue);

        if (links) {
            content.appendChild(links);
        }

        meta.appendChild(badge);
        meta.appendChild(copyButton);
        entry.appendChild(meta);
        entry.appendChild(content);
        item.appendChild(entry);

        return item;
    }

    function renderPublications(publications, authors) {
        const root = document.getElementById('publications-root');
        if (!root) return;

        let activeYear = null;
        let activeList = null;

        root.replaceChildren();

        publications.forEach(function(publication) {
            if (publication.year !== activeYear) {
                const yearHeading = document.createElement('h3');

                activeYear = publication.year;
                activeList = document.createElement('ol');

                yearHeading.id = String(publication.year);
                yearHeading.className = 'year-heading';
                yearHeading.textContent = publication.year;

                activeList.className = 'publication-list';

                root.appendChild(yearHeading);
                root.appendChild(activeList);
            }

            activeList.appendChild(createPublicationItem(publication, authors));
        });
    }

    async function initializePublicationSection() {
        const data = await Promise.all([
            loadJson(publicationDataUrl),
            loadJson(publicationAuthorsUrl)
        ]);

        renderPublications(data[0], data[1]);
    }

    async function copyTextToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const helper = document.createElement('textarea');
        helper.value = text;
        helper.setAttribute('readonly', '');
        helper.style.position = 'absolute';
        helper.style.left = '-9999px';
        document.body.appendChild(helper);
        helper.select();
        document.execCommand('copy');
        document.body.removeChild(helper);
    }

    function parseBibtexEntries(rawBibtex) {
        const entries = {};
        let cursor = 0;

        while (cursor < rawBibtex.length) {
            const entryStart = rawBibtex.indexOf('@', cursor);
            if (entryStart === -1) break;

            const bodyStart = rawBibtex.indexOf('{', entryStart);
            if (bodyStart === -1) break;

            let depth = 0;
            let entryEnd = -1;

            for (let i = bodyStart; i < rawBibtex.length; i += 1) {
                const char = rawBibtex[i];

                if (char === '{') {
                    depth += 1;
                } else if (char === '}') {
                    depth -= 1;
                    if (depth === 0) {
                        entryEnd = i;
                        break;
                    }
                }
            }

            if (entryEnd === -1) break;

            const entryText = rawBibtex.slice(entryStart, entryEnd + 1).trim();
            const entryBody = rawBibtex.slice(bodyStart + 1, entryEnd);
            const firstComma = entryBody.indexOf(',');

            if (firstComma !== -1) {
                const key = entryBody.slice(0, firstComma).trim();
                if (key) {
                    entries[key] = entryText;
                }
            }

            cursor = entryEnd + 1;
        }

        return entries;
    }

    async function loadBibtexLibrary() {
        if (!bibtexLibraryPromise) {
            bibtexLibraryPromise = fetch(publicationBibliographyUrl)
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error(`Failed to load BibTeX library: ${response.status}`);
                    }
                    return response.text();
                })
                .then(parseBibtexEntries);
        }

        return bibtexLibraryPromise;
    }

    function resetCopyButton(button) {
        button.classList.remove('copied', 'error');
        button.textContent = 'cite';
        button.title = 'Copy BibTeX';
        button.setAttribute('aria-label', `Copy BibTeX for ${button.dataset.publicationCode}`);
    }

    function initializePublicationsHeadingWrap() {
        const heading = document.getElementById('publications-and-pre-prints');
        if (!heading) return;

        const measurer = heading.cloneNode(true);
        measurer.removeAttribute('id');
        measurer.setAttribute('aria-hidden', 'true');
        measurer.classList.add('publications-heading-measurer');
        heading.parentNode.insertBefore(measurer, heading.nextSibling);

        const lead = measurer.querySelector('.publications-heading-lead');
        const desktopTail = measurer.querySelector('.publications-heading-desktop-tail');
        if (!lead || !desktopTail) {
            measurer.remove();
            return;
        }

        function updateHeadingText() {
            measurer.classList.remove('publications-heading-short');
            measurer.style.width = `${heading.getBoundingClientRect().width}px`;

            const leadRect = lead.getBoundingClientRect();
            const tailRect = desktopTail.getBoundingClientRect();
            const tailWrapped = tailRect.top > leadRect.top + 1;

            heading.classList.toggle('publications-heading-short', tailWrapped);
        }

        updateHeadingText();

        if (window.ResizeObserver) {
            const observer = new ResizeObserver(updateHeadingText);
            observer.observe(heading.parentElement);
        } else {
            window.addEventListener('resize', updateHeadingText);
        }

        if (document.fonts) {
            document.fonts.ready.then(updateHeadingText);
        }
    }

    function setCopyButtonState(button, state) {
        if (button.dataset.resetTimer) {
            window.clearTimeout(Number(button.dataset.resetTimer));
        }

        button.classList.remove('copied', 'error');

        if (state === 'copied') {
            button.classList.add('copied');
            button.textContent = 'copied';
            button.title = 'Copied';
            button.setAttribute('aria-label', `BibTeX copied for ${button.dataset.publicationCode}`);
        } else if (state === 'error') {
            button.classList.add('error');
            button.textContent = 'error';
            button.title = 'Copy failed';
            button.setAttribute('aria-label', `Copy failed for ${button.dataset.publicationCode}`);
        } else {
            resetCopyButton(button);
            return;
        }

        button.dataset.resetTimer = window.setTimeout(function() {
            resetCopyButton(button);
        }, 1600);
    }

    async function initializePublications() {
        const counters = {
            conference: 0,
            journal: 0,
            informal: 0
        };

        const prefixes = {
            conference: 'c',
            journal: 'j',
            informal: 'i'
        };

        const publicationItems = document.querySelectorAll('.publication-item');
        const copyButtons = document.querySelectorAll('.publication-copy-button');

        copyButtons.forEach(function(button) {
            button.hidden = true;
        });

        let bibtexEntries = {};

        try {
            bibtexEntries = await loadBibtexLibrary();
        } catch (error) {
            console.error(error);
        }

        publicationItems.forEach(function(item) {
            const type = item.getAttribute('data-publication-type') || 'informal';
            counters[type] = (counters[type] || 0) + 1;
        });

        publicationItems.forEach(function(item) {
            const type = item.getAttribute('data-publication-type') || 'informal';
            const bibtexKey = item.getAttribute('data-bibtex-key');
            const badge = item.querySelector('.publication-badge');
            const copyButton = item.querySelector('.publication-copy-button');
            const prefix = prefixes[type] || 'i';

            const code = prefix + String(counters[type]).padStart(2, '0');
            counters[type] -= 1;

            item.setAttribute('data-publication-code', code);

            if (badge) {
                badge.textContent = code;
                badge.classList.add(`publication-badge-${type}`);
                badge.setAttribute('title', `${getPublicationTypeLabel(type)} publication`);
                badge.setAttribute('aria-label', `${getPublicationTypeLabel(type)} publication ${code}`);
            }

            if (!copyButton) return;

            if (!bibtexKey || !bibtexEntries[bibtexKey]) {
                copyButton.hidden = true;
                return;
            }

            copyButton.dataset.publicationCode = code;
            copyButton.hidden = false;
            resetCopyButton(copyButton);

            copyButton.addEventListener('click', async function() {
                try {
                    await copyTextToClipboard(bibtexEntries[bibtexKey]);
                    setCopyButtonState(copyButton, 'copied');
                } catch (error) {
                    setCopyButtonState(copyButton, 'error');
                }
            });
        });
    }
    
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
                updateAuthorDisplay(element, isNarrowScreen);
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
    initializeProfilePills();
    initializePublicationsHeadingWrap();
    initializePublicationSection()
        .then(function() {
            initializePublications();
            shortenNames();
        })
        .catch(function(error) {
            console.error(error);
            initializePublications();
            shortenNames();
        });
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
