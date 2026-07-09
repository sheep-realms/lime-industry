"use strict";

const ITEM_NAME = EchoLiveTools.getUrlParam('name');

if (ITEM_NAME === null) {
    throw Error('Missing ITEM_NAME');
}

const dom = {
    galleryImage: $('#gallery-image'),
    specifications: $('#product-specifications')
}

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

function selectSpecifications(name) {
    selectedSpecification = name;
    if (name === undefined) {
        dom.galleryImage.attr('src', getGalleryPath(itemData.cover));
        $('#product-body').html(marked.parse(markdownBodyCache.get('_')));
        return;
    }
    
    const specification = getSpecification(name);
    if (specification === undefined) return;

    if (specification.image_src) {
        dom.galleryImage.attr('src', getGalleryPath(specification.image_src));
    } else {
        dom.galleryImage.attr('src', getGalleryPath(itemData.cover));
    }

    const text = markdownBodyCache.get(specification.readme);
    if (text !== undefined) {
        $('#product-body').html(marked.parse(text));
    } else {
        $('#product-body').html(marked.parse(markdownBodyCache.get('_')));
    }
}

async function downloadSchematic(name) {
    const specification = getSpecification(name);
    const path = `schematic/${ itemData.path }-${ specification.name }.nbt`;
    window.open(path);
}

$(document).ready(async function() {
    itemData = await loadJson(`schematic/${ ITEM_NAME }.json`);
    $('head title').text(`${ itemData.title } | 产品 | 青柠工业`)
    $("#h1-value").text(itemData.title);
    dom.galleryImage.attr('src', getGalleryPath(itemData.cover));
    dom.galleryImage.attr('alt', itemData.title);

    dom.specifications.text('');
    itemData.specifications.forEach(e => {
        dom.specifications.append(`<button class="tag-btn" data-name="${e.name}">${e.name}</button>`);
    });

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