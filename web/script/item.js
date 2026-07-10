"use strict";

const ITEM_NAME = EchoLiveTools.getUrlParam('name');

if (ITEM_NAME === null) {
    throw Error('Missing ITEM_NAME');
}

const dom = {
    attribute: $('#product-attribute'),
    galleryImage: $('#gallery-image'),
    specifications: $('#product-specifications'),
    title: $('#product-title'),
}

const SCHEMATIC_ATTRIBUTE = {
    cold_start_load_stress: {
        title: '冷启动应力负载',
        template: v => `${v} su`
    },
    load_stress: {
        title: '应力负载',
        template: v => `${v} su`
    },
    input_rpm_max: {
        title: '最高输入转速',
        template: v => `${v} RPM`
    },
    input_rpm_min: {
        title: '最低输入转速',
        template: v => `${v} RPM`
    },
    input_rpm_reference: {
        title: '基准输入转速',
        template: v => `${v} RPM`
    },
    output_stress: {
        title: '输出应力',
        template: v => `${v} su`
    },
    output_rpm: {
        title: '输出转速',
        template: v => `${v} RPM`
    },
    size: {
        title: '尺寸',
        template: v => `${v[0]} × ${v[1]} × ${v[2]} B`
    }
};

let itemData;
let selectedSpecification;
let markdownBodyCache = new Map();

async function loadJson(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to load ${path}`);
    }
    return response.json();
}

async function loadText(path) {
    const response = await fetch(path);
    if (!response.ok) {
        throw new Error(`Failed to load ${path}`);
    }
    const text = await response.text();
    return text;
}

async function loadSpecificationsMarkdown(data) {
    if (typeof data.readme !== 'string' || data.readme === "") return;
    if (markdownBodyCache.has(data.readme)) return;
    markdownBodyCache.set(data.readme, '');
    const name = data.name;
    try {
        const markdown = await loadText(`schematic/${ itemData.path }-${ data.readme }.md`);
        markdownBodyCache.set(data.readme, markdown);
    } catch (error) {
        markdownBodyCache.delete(data.readme);
        return;
    }
}

function getGalleryPath(path) {
    return `assets/image/gallery/${path}`;
}

function getSpecification(name) {
    return itemData.specifications.find(e => e.name === name);
}

function getAttribute(specificationName) {
    let attr = itemData.attribute;
    if (specificationName === undefined) {
        if (!itemData.use_default_attribute) return attr;
        specificationName = itemData.specifications[0].name;
    }
    const s = getSpecification(specificationName);
    if (s === undefined) return attr;
    attr = {
        ...attr,
        ...s.attribute
    }
    return attr;
}

function renderAttribute() {
    dom.attribute.text('');
    const attr = getAttribute(selectedSpecification);
    for (const key in SCHEMATIC_ATTRIBUTE) {
        if (!Object.hasOwn(SCHEMATIC_ATTRIBUTE, key)) continue;
        if (attr[key] === undefined) continue;
        const element = SCHEMATIC_ATTRIBUTE[key];
        dom.attribute.append(`<dl>
                <dt>${ element.title }</dt>
                <dd>${ element.template(attr[key]) }</dd>
            </dl>`);
    }
}

function selectSpecifications(name) {
    selectedSpecification = name;
    renderAttribute();
    if (name === undefined) {
        dom.galleryImage.attr('src', getGalleryPath(itemData.cover));
        dom.galleryImage.addClass('loading');
        $('#product-body').html(marked.parse(markdownBodyCache.get('_')));
        dom.title.text(itemData.default_readme_title ?? itemData.title);
        return;
    }
    
    const specification = getSpecification(name);
    if (specification === undefined) return;
    if (specification.unique) {
        dom.title.text(itemData.title);
    } else {
        dom.title.text(`${ itemData.title }-${ specification.name }`);
    }

    if (specification.image_src) {
        dom.galleryImage.attr('src', getGalleryPath(specification.image_src));
    } else {
        dom.galleryImage.attr('src', getGalleryPath(itemData.cover));
    }
    dom.galleryImage.addClass('loading');

    const text = markdownBodyCache.get(specification.readme);
    if (text !== undefined) {
        $('#product-body').html(marked.parse(text));
    } else {
        $('#product-body').html(marked.parse(markdownBodyCache.get('_')));
    }
}

async function downloadSchematic(name) {
    const specification = getSpecification(name);
    let path = `schematic/${ itemData.path }-${ specification.name }.nbt`;
    if (specification.download_url !== undefined) {
        let p = itemData.path.split('/');
        p.pop();
        path = `schematic/${ p.join('/') }/${ specification.download_url }.nbt`;
    }
    window.open(path);
}

$(document).ready(async function() {
    itemData = await loadJson(`schematic/${ ITEM_NAME }.json`);
    Object.freeze(itemData);
    $('head title').text(`${ itemData.title } | 产品 | 青柠工业`)
    $("#h1-value").text(itemData.title);
    dom.title.text(itemData.default_readme_title ?? itemData.title);
    dom.galleryImage.attr('src', getGalleryPath(itemData.cover));
    dom.galleryImage.attr('alt', itemData.title);
    dom.galleryImage.addClass('loading');

    dom.specifications.text('');
    itemData.specifications.forEach(e => {
        dom.specifications.append(`<button data-name="${e.name}">${e.name}</button>`);
    });

    renderAttribute();

    try {
        const markdownBody = await loadText(`schematic/${ ITEM_NAME }.md`);
        markdownBodyCache.set('_', markdownBody);
        $('#product-body').html(marked.parse(markdownBody));
    } catch (_) {}

    itemData.specifications.forEach(e => loadSpecificationsMarkdown(e));
});

$(document).on('click', '#product-specifications button', function() {
    const name = $(this).data('name');
    if ($(this).hasClass('soild')) {
        $('#product-specifications button').removeClass('soild');
        $('#btn-download').attr('disabled', 'true');
        $('#btn-download').text('请选择产品规格');
        selectSpecifications();
        return;
    }
    $('#product-specifications button').removeClass('soild');
    $('#btn-download').removeAttr('disabled');
    $('#btn-download').text('下载蓝图');
    $(this).addClass('soild');
    selectSpecifications(name);
});

$(document).on('click', '#btn-download', function() {
    downloadSchematic(selectedSpecification);
});

$('#gallery-image').on('load', function() {
    dom.galleryImage.removeClass('loading');
});