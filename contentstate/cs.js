function $(s) {
    if (s.startsWith("#")) {
        return document.getElementById(s.substring(1));
    } else {
        return document.querySelectorAll(s);
    }
}

const cp = $("#cp");
const vault = cp.vault;
const thumbHelper = IIIFVaultHelpers.createThumbnailHelper(cp.vault);
const collectionPath = [];
let currentManifestId = null;
let currentCanvasId = null;
let currentContentStateCapture = null;


clear();
setRecents();

$("#mediaUrl").addEventListener("change", loadIIIF);
$("#refreshUrl").addEventListener("click", loadIIIF);

function clear() {
    $("#treeHolder").style.display = "none";
    $("#thumbnailsContainer").style.display = "none";
    $("#canvas").style.display = "none";
    $("#selection").innerText = "";
}

function truncate(s) {
    if (s && s.length > 85) {
        return s.substring(0, 82) + "...";
    }
    return s;
}

function setRecents() {
    const recents = $("#recentResources");
    recents.innerHTML = "";
    const header = document.createElement("li");
    header.innerHTML = '<h6 class="dropdown-header">Recent manifests and collections</h6>';
    recents.append(header);
    for (resource of recentStarts) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.className = "dropdown-item";
        a.href = resource.id;
        a.innerHTML = getLabelledIcon(resource, resource.label.en[0]); // this is not normally safe!
        a.addEventListener("click", function(e) {
            e.preventDefault();
            $("#mediaUrl").value = this.href;
            loadIIIF();
        });
        li.append(a);
        recents.append(li);
    }
}

function getLabelledIcon(resource, label) {
    return '<i class="' + getIconClass(resource) + '"></i> ' + truncate(label);
}

function getIconClass(resource) {
    return resource.type == "Collection" ? "bi bi-folder" : "bi bi-file-earmark-richtext";
}

async function loadIIIF() {
    let url = $("#mediaUrl").value.trim();
    clear();
    if (url) {
        const iiifResource = await vault.load(url);
        if (iiifResource.type == "Manifest") {
            setManifest(iiifResource);
        } else if (iiifResource.type == "Collection") {
            startTree(iiifResource);
        } else if (iiifResource.type == "Canvas") {
            showCanvasById(iiifResource.id);
        }
    }
}

async function setManifest(manifest) {
    currentManifestId = manifest.id;
    const thumbDiv = $("#thumbnails");
    $("#thumbnailsContainer").style.display = "grid";
    thumbDiv.innerHTML = "";
    $("#selectedManifestLabel").innerText = getLabel(manifest, manifest);
    for (canvasRef of manifest.items) {
        const canvas = vault.get(canvasRef);
        const img = document.createElement("img");
        const cvThumb = await thumbHelper.getBestThumbnailAtSize(canvas, { maxWidth: 100 });
        // hack to fix thumbnail bug - not a very safe hack but anyway...
        let thumbUrl = cvThumb.best.id;
        thumbUrl = thumbUrl.replace("/99,", "/100,");
        thumbUrl = thumbUrl.replace(",99/", ",100/");
        img.src = thumbUrl;
        const canvasId = canvas.id;
        img.addEventListener("click", () => showCanvasById(canvasId));
        thumbDiv.append(img);
    }
}

async function startTree(collection) {
    const top = $("#treeHolder");
    const inner = $("#treeHolderInner");
    const lists = inner.getElementsByTagName("ul");
    if (lists.length > 0) {
        lists[0].remove();
    }
    top.style.display = "grid";
    const vColl = await vault.load(collection);
    $("#selectedResourceLabel").innerText = getLabel(collection, vColl);
    await renderInto(inner, vColl);
}


function getLabel(res1, res2) {
    return IIIFVaultHelpers.getValue(res1.label) || IIIFVaultHelpers.getValue(res2.label);
}

async function renderInto(element, collection) {
    const ul = document.createElement("ul");
    ul.className = "list-group";
    ul.classList.add("list-group-flush");
    for (item of collection.items) {
        const vItem = vault.get(item);
        const label = getLabel(vItem, item);
        const li = document.createElement("li");
        li.className = "list-group-item";
        const a = document.createElement("a");
        a.href = item.id;
        a.setAttribute("data-type", item.type);
        a.innerHTML = getLabelledIcon(item, label)
        li.append(a);
        ul.append(li);
        a.addEventListener("click", async function(e) {
            e.preventDefault();
            if (this.getAttribute("data-type") == "Manifest") {
                const manifest = await vault.load(this.href);
                setManifest(manifest);
            } else if (this.getAttribute("data-type") == "Collection") {
                const childUls = this.parentElement.getElementsByTagName("ul");
                if (childUls.length > 0) {
                    childUls[0].remove();
                } else {
                    const lip = this.parentElement;
                    const subCollection = await vault.load(this.href);
                    renderInto(lip, subCollection);
                }
            }
        });
    }
    element.append(ul);

}

function showCanvasById(canvasId) {
    $("#canvas").style.display = "grid";
    cp.setCanvas(canvasId);
    currentCanvasId = canvasId;
}

$("#treeExpander").addEventListener("click", () => $("#treeHolderInner").classList.toggle("expanded"));