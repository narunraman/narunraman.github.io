document.addEventListener('DOMContentLoaded', function() {
    const projectsUrl = '/assets/software/projects.json';
    const publicationsUrl = '/assets/publications/publications.json';
    const root = document.getElementById('software-project-root');
    const intro = document.querySelector('.intro-text');

    if (!root) return;

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

    function createLink(href, className, text) {
        const link = document.createElement('a');
        link.href = href;
        link.className = className;
        link.textContent = text;
        return link;
    }

    function createResourcePills(project) {
        const links = project.resources || [];
        if (links.length === 0) return null;

        const list = document.createElement('ul');
        list.className = 'software-project-resources';
        list.setAttribute('aria-label', `${project.title} resources`);

        links.forEach(function(resource) {
            const item = document.createElement('li');
            item.appendChild(createLink(resource.href, '', resource.label));
            list.appendChild(item);
        });

        return list;
    }

    function createProjectShell(project, options) {
        const item = document.createElement('li');
        const main = document.createElement('div');
        const title = document.createElement('h2');
        const description = document.createElement('p');
        const titleLink = document.createElement('a');
        const linkTitle = !options || options.linkTitle !== false;

        item.className = 'software-project-item';
        item.dataset.projectId = project.id;
        main.className = 'software-project-main';
        title.className = 'software-project-title';
        description.className = 'software-project-description';
        description.textContent = project.summary;

        if (linkTitle) {
            titleLink.href = `/software/#${project.id}`;
            titleLink.textContent = project.title;
            title.appendChild(titleLink);
        } else {
            title.textContent = project.title;
        }

        main.appendChild(title);
        main.appendChild(description);

        item.appendChild(main);

        if (project.homepage) {
            item.appendChild(createLink(project.homepage, 'software-project-link', 'Project page'));
        }

        return { item, main, description };
    }

    function createCompactProject(project) {
        const shell = createProjectShell(project);
        const pills = createResourcePills(project);

        if (pills) {
            shell.main.appendChild(pills);
        }

        return shell.item;
    }

    function createDetailList(resources) {
        if (!resources || resources.length === 0) return null;

        const list = document.createElement('ul');
        list.className = 'software-detail-list';

        resources.forEach(function(resource) {
            const item = document.createElement('li');
            const header = document.createElement('div');
            const title = document.createElement('span');
            const description = document.createElement('p');
            const url = document.createElement('a');

            item.className = 'software-detail-item';
            header.className = 'software-detail-header';
            title.className = 'software-detail-title';
            title.textContent = resource.title || resource.label;
            description.className = 'software-detail-description';
            description.textContent = resource.description;
            url.href = resource.href;
            url.className = 'software-detail-url';
            url.textContent = resource.href.replace(/^https?:\/\//, '');

            header.appendChild(title);
            item.appendChild(header);
            item.appendChild(description);
            item.appendChild(url);
            list.appendChild(item);
        });

        return list;
    }

    function createSection(titleText, child) {
        if (!child) return null;

        const section = document.createElement('section');
        const title = document.createElement('h3');

        section.className = 'software-detail-section';
        title.className = 'software-detail-section-title';
        title.textContent = titleText;

        section.appendChild(title);
        section.appendChild(child);

        return section;
    }

    function getPrimaryPublicationHref(publication) {
        const links = publication.links || [];
        const preferredKinds = ['doi', 'arxiv', 'pdf'];
        const paperLink = links.find(function(link) {
            return link.label && link.label.toLowerCase() === 'paper';
        });

        if (paperLink) {
            return paperLink.href;
        }

        for (const kind of preferredKinds) {
            const match = links.find(function(link) {
                return link.kind === kind;
            });

            if (match) {
                return match.href;
            }
        }

        return `/#${publication.id}`;
    }

    function createRelatedPublications(project, publicationsById) {
        if (project.relatedPublications && project.relatedPublications.length > 0) {
            const curatedList = document.createElement('ul');
            curatedList.className = 'software-related-publications';

            project.relatedPublications.forEach(function(publication) {
                const item = document.createElement('li');
                item.appendChild(createLink(publication.href, '', publication.title));
                curatedList.appendChild(item);
            });

            return curatedList;
        }

        const publicationIds = project.publications || [];
        if (publicationIds.length === 0) return null;

        const list = document.createElement('ul');
        list.className = 'software-related-publications';

        publicationIds.forEach(function(publicationId) {
            const publication = publicationsById[publicationId];
            const item = document.createElement('li');

            if (publication) {
                item.appendChild(createLink(getPrimaryPublicationHref(publication), '', publication.title));
            } else {
                item.textContent = publicationId;
            }

            list.appendChild(item);
        });

        return list;
    }

    function createFocusedProject(project, publicationsById) {
        const shell = createProjectShell(project, { linkTitle: false });
        const details = document.createElement('div');
        const backLink = createLink('/software/', 'software-back-link', 'All software');
        const resources = createSection('Resources', createDetailList(project.resources));
        const relevantLinks = createSection('Relevant links', createDetailList(project.relatedLinks));
        const relatedPublications = createSection('Related publications', createRelatedPublications(project, publicationsById));

        shell.item.classList.add('software-project-item-focused');
        shell.description.textContent = project.description || project.summary;

        details.className = 'software-project-details';
        [resources, relevantLinks, relatedPublications].forEach(function(section) {
            if (section) {
                details.appendChild(section);
            }
        });

        shell.main.appendChild(details);
        shell.item.insertBefore(backLink, shell.item.firstChild);

        return shell.item;
    }

    function getFocusedProject(projects) {
        const id = window.location.hash.slice(1);
        if (!id) return null;
        return projects.find(function(project) {
            return project.id === id;
        }) || null;
    }

    function render(projects, publications) {
        const publicationsById = {};
        const focusedProject = getFocusedProject(projects);
        const list = document.createElement('ul');

        publications.forEach(function(publication) {
            publicationsById[publication.id] = publication;
        });

        root.replaceChildren();
        root.classList.toggle('software-focused-root', Boolean(focusedProject));
        list.className = 'software-project-list';

        if (focusedProject) {
            if (intro) {
                intro.textContent = 'Project details and related artifacts.';
            }
            list.appendChild(createFocusedProject(focusedProject, publicationsById));
        } else {
            if (intro) {
                intro.textContent = 'Selected tools and research artifacts.';
            }
            projects.forEach(function(project) {
                list.appendChild(createCompactProject(project));
            });
        }

        root.appendChild(list);
    }

    Promise.all([loadJson(projectsUrl), loadJson(publicationsUrl)])
        .then(function(data) {
            const projects = data[0];
            const publications = data[1];

            render(projects, publications);
            window.addEventListener('hashchange', function() {
                render(projects, publications);
            });
        })
        .catch(function(error) {
            console.error(error);
            appendText(root, 'Software projects could not be loaded.');
        });
});
