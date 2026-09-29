document.addEventListener('DOMContentLoaded', function() {
    const projectsUrl = '/assets/software/projects.json';
    const root = document.getElementById('software-project-root');
    const domains = [
        {
            id: 'machine-behavior',
            title: 'Machine behavior',
            description: 'Software for building, evaluating, and interrogating language models.',
            image: '/assets/software/software-1.png',
            imageAlt: 'A monochrome sculptural figure with a bird-like head.',
            imageSide: 'right'
        },
        {
            id: 'human-behavior',
            title: 'Human behavior',
            description: 'Software for studying how people make decisions in digital markets.',
            image: '/assets/software/software-3.png',
            imageAlt: 'A monochrome sculptural human figure with layered hands.',
            imageSide: 'left'
        }
    ];

    if (!root) return;

    async function loadJson(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status}`);
        }
        return response.json();
    }

    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Reads an optional "updated": "YYYY-MM" from projects.json. Without one it
    // falls back to the bare year rather than inventing a month.
    function formatUpdated(project) {
        const stamp = /^(\d{4})-(\d{2})$/.exec(project.updated || '');
        if (stamp) return `last updated ${MONTHS[Number(stamp[2]) - 1]} ${stamp[1]}`;
        if (project.year) return `last updated ${project.year}`;
        return '';
    }

    function appendText(parent, text) {
        parent.appendChild(document.createTextNode(text));
    }

    function createLink(href, className, text) {
        const link = document.createElement('a');
        link.href = href;
        link.className = className;
        link.textContent = text;
        return link;
    }

    function createExternalLink(href, className, text) {
        const link = createLink(href, className, text);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        return link;
    }

    // The globe reads as "this leaves the site", matching how the GitHub and
    // Hugging Face marks stand in for their destinations.
    function createSiteAction(project) {
        const link = createExternalLink(project.homepage, 'software-project-action', '');
        const icon = document.createElement('i');
        const labelText = document.createElement('span');

        icon.className = 'fas fa-globe software-project-icon';
        icon.setAttribute('aria-hidden', 'true');
        labelText.className = 'software-project-action-label';
        labelText.textContent = 'project page';
        link.setAttribute('aria-label', `${project.title} project page`);
        link.title = 'project page';
        link.appendChild(icon);
        link.appendChild(labelText);
        return link;
    }

    function createResourceAction(resource) {
        const labels = {
            github: 'code',
            huggingface: 'dataset'
        };
        const label = labels[resource.kind] || resource.title || resource.label;
        const link = createExternalLink(resource.href, 'software-project-action', '');
        const labelText = document.createElement('span');

        link.setAttribute('aria-label', label);
        link.title = label;
        labelText.className = 'software-project-action-label';
        labelText.textContent = label;

        if (resource.kind === 'github') {
            const icon = document.createElement('i');
            icon.className = 'fab fa-github software-project-icon';
            icon.setAttribute('aria-hidden', 'true');
            link.insertBefore(icon, link.firstChild);
        }

        if (resource.kind === 'huggingface') {
            const icon = document.createElement('img');
            icon.className = 'software-project-icon';
            icon.src = '/assets/logos/hf_logo.svg';
            icon.alt = '';
            link.insertBefore(icon, link.firstChild);
        }

        link.appendChild(labelText);

        return link;
    }

    function createDirectProject(project) {
        const item = document.createElement('li');
        const year = document.createElement('div');
        const content = document.createElement('div');
        const title = document.createElement('h3');
        const description = document.createElement('p');
        const actions = document.createElement('nav');
        const footer = document.createElement('div');

        item.className = 'software-project-item';
        year.className = 'software-project-year';
        year.textContent = formatUpdated(project);
        content.className = 'software-project-content';
        title.className = 'software-project-title';
        description.className = 'software-project-description';
        description.textContent = project.summary;
        actions.className = 'software-project-actions';
        actions.setAttribute('aria-label', `${project.title} links`);
        footer.className = 'software-project-footer';

        if (project.homepage) {
            const desktopTitle = document.createElement('span');
            const mobileTitle = createExternalLink(project.homepage, 'software-project-title-link', project.title);

            desktopTitle.className = 'software-project-title-text';
            desktopTitle.textContent = project.title;
            mobileTitle.setAttribute('aria-label', `${project.title} project page`);
            title.appendChild(desktopTitle);
            title.appendChild(mobileTitle);
        } else {
            title.textContent = project.title;
        }
        // The divider is its own element rather than a ::before on the next
        // link, so it is not part of that link's hit area or hover state.
        function addAction(link) {
            if (actions.childElementCount) {
                const separator = document.createElement('span');
                separator.className = 'software-project-sep';
                separator.setAttribute('aria-hidden', 'true');
                separator.textContent = '/';
                actions.appendChild(separator);
            }
            actions.appendChild(link);
        }

        if (project.homepage) addAction(createSiteAction(project));
        (project.resources || [])
            .filter(function(resource) { return resource.kind === 'github' || resource.kind === 'huggingface'; })
            .forEach(function(resource) { addAction(createResourceAction(resource)); });

        // Links left, date right, on one line under the copy. Keeping the date
        // out of a second grid column lets the description use the full width.
        footer.appendChild(actions);
        footer.appendChild(year);
        content.appendChild(title);
        content.appendChild(description);
        content.appendChild(footer);
        item.appendChild(content);
        return item;
    }

    function createDomainModal(domain, projectsInDomain) {
        const modal = document.createElement('div');
        const panel = document.createElement('div');
        const closeButton = document.createElement('button');
        const heading = document.createElement('h3');
        const list = document.createElement('ol');

        modal.className = 'software-domain-modal';
        modal.hidden = true;
        panel.className = 'software-domain-modal-panel';
        closeButton.type = 'button';
        closeButton.className = 'software-domain-close';
        closeButton.setAttribute('aria-label', `Close ${domain.title}`);
        closeButton.innerHTML = '&times;';
        heading.className = 'software-domain-modal-title';
        heading.textContent = domain.title;
        list.className = 'software-project-list software-project-list--modal';

        projectsInDomain.forEach(function(project) { list.appendChild(createDirectProject(project)); });

        closeButton.addEventListener('click', function() {
            modal.hidden = true;
            document.body.classList.remove('software-modal-open');
        });

        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.hidden = true;
                document.body.classList.remove('software-modal-open');
            }
        });

        panel.appendChild(closeButton);
        panel.appendChild(heading);
        panel.appendChild(list);
        modal.appendChild(panel);

        return modal;
    }

    function createDomain(domain, projects) {
        const projectsInDomain = projects
            .filter(function(project) { return project.domain === domain.id; })
            .sort(function(first, second) { return (second.year || 0) - (first.year || 0); });
        if (projectsInDomain.length === 0) return null;

        const section = document.createElement('section');
        const header = document.createElement('header');
        const title = document.createElement('h2');
        const description = document.createElement('p');
        const visual = document.createElement('figure');
        const image = document.createElement('img');
        const list = document.createElement('ol');
        const hit = document.createElement('button');
        const cta = document.createElement('p');
        const modal = createDomainModal(domain, projectsInDomain);

        section.className = `software-domain software-domain--visual-${domain.imageSide}`;
        // lets the stylesheet address each card on its own
        section.dataset.domain = domain.id;
        title.className = 'software-domain-title';
        title.id = `${domain.id}-title`;
        title.textContent = domain.title;
        description.className = 'software-domain-description';
        description.textContent = domain.description;
        visual.className = 'software-domain-visual';
        image.src = domain.image;
        image.alt = domain.imageAlt;
        list.className = 'software-project-list';

        const count = projectsInDomain.length;
        const countLabel = `${count} project${count === 1 ? '' : 's'}`;

        cta.className = 'software-domain-cta';
        cta.textContent = countLabel;

        // A real button stretched over the whole card: the entire card is the
        // tap target on mobile, and it stays keyboard- and screen-reader-
        // reachable without faking one out of the <section>. Hidden on desktop,
        // where the project list is already on the page.
        hit.type = 'button';
        hit.className = 'software-domain-hit';
        hit.setAttribute('aria-label', `${domain.title} — ${countLabel}`);
        hit.setAttribute('aria-expanded', 'false');

        hit.addEventListener('click', function() {
            modal.hidden = !modal.hidden;
            document.body.classList.toggle('software-modal-open', !modal.hidden);
            hit.setAttribute('aria-expanded', String(!modal.hidden));
        });

        visual.appendChild(image);
        header.className = 'software-domain-header';
        header.appendChild(title);
        header.appendChild(visual);
        header.appendChild(description);
        header.appendChild(cta);
        section.setAttribute('aria-labelledby', title.id);
        section.appendChild(hit);
        section.appendChild(header);
        projectsInDomain.forEach(function(project) { list.appendChild(createDirectProject(project)); });
        section.appendChild(list);
        section.appendChild(modal);
        return section;
    }

    /* The artwork is absolutely positioned, so text has no idea it is there.
       Rather than hand-tuning a clearance every time --art-x / --art-top move,
       measure which blocks the figure actually overlaps and reserve exactly
       enough room on those. Blocks it clears keep the full measure. */
    function syncArtClearance() {
        const GAP = 16;
        const sections = [...document.querySelectorAll('.software-domain')];

        // Clear everything first, so a second pass never measures its own
        // previous shift and compounds it.
        const blocks = sections.map(function(section) {
            const list = [...section.querySelectorAll('.software-domain-header, .software-project-item')];
            list.forEach(function(el) {
                el.style.removeProperty('--row-clear');
                el.style.removeProperty('--row-shift');
            });
            return {section, list};
        });

        blocks.forEach(function({section, list}) {
            const figure = section.querySelector('.software-domain-visual');
            if (!figure) return;
            const art = figure.getBoundingClientRect();
            if (!art.width) return;
            const onLeft = section.classList.contains('software-domain--visual-left');

            list.forEach(function(el) {
                const box = el.getBoundingClientRect();
                const overlapsVertically =
                    Math.min(box.bottom, art.bottom) - Math.max(box.top, art.top) > 0;
                if (!overlapsVertically) return;

                if (onLeft) {
                    const shift = Math.round(art.right - box.left + GAP);
                    if (shift > 0) el.style.setProperty('--row-shift', shift + 'px');
                } else {
                    const clear = Math.round(box.right - art.left + GAP);
                    if (clear > 0) el.style.setProperty('--row-clear', clear + 'px');
                }
            });
        });
    }

    function render(projects) {
        root.replaceChildren();
        domains.forEach(function(domain) {
            const section = createDomain(domain, projects);
            if (section) root.appendChild(section);
        });
    }

    loadJson(projectsUrl)
        .then(function(projects) {
            render(projects);
            syncArtClearance();
            // Web fonts land after first paint and change where text ends.
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(syncArtClearance);
            }
            let resizeTimer;
            window.addEventListener('resize', function() {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(syncArtClearance, 120);
            });
        })
        .catch(function(error) {
            console.error(error);
            appendText(root, 'Software projects could not be loaded.');
        });
});
