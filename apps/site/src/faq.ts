/**
 * Questions: on wide screens the open answer shows in a panel beside the list; on phones they stay a plain accordion.
 * @license AGPL-3.0
 */

const list = document.getElementById('faq'), panel = document.getElementById('faqAnswer');
const wide = matchMedia('(min-width: 900px)');

if (list && panel) {
    const items = [...list.querySelectorAll('details')];
    const show = (d: HTMLDetailsElement) => {
        items.forEach(x => x.classList.toggle('is-current', x === d));
        const more = d.dataset.more ? `<a class="textlink more" href="${d.dataset.more}">Read more</a>` : '';
        panel.querySelector('.answer')!.innerHTML = `<h2>${d.querySelector('summary')!.textContent}</h2>${d.querySelector('p')!.outerHTML}${more}`;
    };
    items.forEach(d => d.querySelector('summary')!.addEventListener('click', e => {
        if (!wide.matches) return;
        e.preventDefault(); // on wide screens the answer goes to the panel instead of opening in place
        show(d);
    }));
    document.body.classList.add('faq-js');
    show(items[0]);
}
