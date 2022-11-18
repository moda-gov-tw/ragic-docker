const UploadFieldAgent = (function () {
    "use strict";

    const agent = {uploadFields: {}};
    let latestAutoNum = 0;
    agent.createUploadField = function (input, parent) {
        const id = 'uploadField' + (latestAutoNum++);
        const domainId = input.name;
        const multiple = input.multiple;
        const accept = input.accept;
        const uploadField = new UploadField(input, parent, id, domainId, multiple, accept);
        this.uploadFields[id] = uploadField;
        return uploadField;
    };
    agent.getUploadField = function (id) {
        const uploadField = this.uploadFields[id];
        if (!uploadField) {
            console.error('Non-exist id');
            return;
        }
        return uploadField;
    };
    agent.removeUploadField = function (id) {
        const uploadField = this.uploadFields[id];
        if (!uploadField) {
            console.error('Non-exist id');
            return;
        }
        this.uploadFields[id] = null;
    }

    function UploadField(input, parent, id, domainId, multiple, accept) {
        this.input = input;
        this.parent = parent;
        this.id = id;
        this.domainId = domainId;
        this.multiple = multiple;
        this.accept = accept;
        this.isGraphic = this.accept === 'image/*';
        this._value = '';
        this.render();
    }
    Object.defineProperty(UploadField.prototype, 'value', {
        get: function () {
            return this._value.split('|').filter(function (val) {
                return val.length;
            });
        },
        set: function (fileName) {
            this._value = fileName;
            this.input.value = this.value.join('|');
            this.createImgByFile();
            triggerEvent(this.input, 'change');
        }
    });
    UploadField.prototype.loadFile = function (event) {
        const t = this;
        const input = event.target;
        const widget = this.element.closest('.webFormWidget');
        const toUploadFiles = this.removeFilesWhichExceedMaxSize(Array.from(input.files), widget);
        const formData = new FormData();
        const acceptImg = this.isGraphic;
        const resizeFilePromises = toUploadFiles.map(function (file) {
            return resizeImage(file, widget, acceptImg);
        });
        if (this.maxSizeErrorMsg) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = this.maxSizeErrorMsg;
            webForm.showMsg(wrapper, null);
            this.maxSizeErrorMsg = null;
        }
        if (resizeFilePromises.length) {
            Promise.all(resizeFilePromises).then(function (blobs) {
                const url = "/sims/quickUpload.jsp?a=" + ap + "&p=" + path + "&si=" + sheetIndex + "&ud=" + t.domainId + "&n=-1" + "&fc=" + blobs.length;
                blobs.forEach(function (blob, index) {
                    formData.append("uf", blob, toUploadFiles[index].name);
                });
                postFormDataPromise(url, formData).then(function (response) {
                    const fileNameString = response.trim();
                    if (fileNameString) t.value = (t.multiple ? t._value + '|' : '') + fileNameString;
                });
            });
        }
    };
    UploadField.prototype.removeFilesWhichExceedMaxSize = function (files, widget) {
        const maxUploadSize = parseInt(widget.getAttribute('maxfilesize') || (licenseType === "DISTR" ? 10 * 1024 * 1024 * 1024 : 1024 * 1024 * 1024));
        const maxUploadSizeNum = widget.getAttribute('maxFileSize_number') || (licenseType === "DISTR" ? "10" : "1");
        const maxUploadSizeUnit = widget.getAttribute('maxFileSize_unit') || "GB";
        const fileExtensionFilters = widget.hasAttribute('f_extensions') ? widget.getAttribute('f_extensions').split(',') : [];
        const failFlag = {
            'exceedMaxFileSizeReason': false,
            'fileTypeNotMatchContent': false
        };
        const validFiles = files.filter(function (file) {
            const fileName = file.name;
            const exceedMaxFilePass = file.size <= maxUploadSize;
            const fileTypePass = fileExtensionFilters.length ? fileExtensionFilters.some(function (fileExtensionFilter) {
                return fileExtensionFilter === fileName.substring(fileName.lastIndexOf("."));
            }) : true;
            return exceedMaxFilePass && fileTypePass;
        });
        const invalidFiles = files.filter(function (file) {
            const fileName = file.name;
            const exceedMaxFilePass = file.size <= maxUploadSize;
            const fileTypePass = fileExtensionFilters.length ? fileExtensionFilters.some(function (fileExtensionFilter) {
                return fileExtensionFilter === fileName.substring(fileName.lastIndexOf("."));
            }) : true;
            if (!exceedMaxFilePass) failFlag['exceedMaxFileSizeReason'] = true;
            if (!fileTypePass) failFlag['fileTypeNotMatchContent'] = true;
            return !exceedMaxFilePass || !fileTypePass;
        });
        if (invalidFiles.length > 0) {
            let html = getBundleString("exceedMaxFileSizeTitle", [files.length, validFiles.length, invalidFiles.length]);
            html += lm['exceedMaxFileSize'];
            invalidFiles.forEach(function (file) {
                html += "<div class='exceedMaxSizeFile'><div style='flex:1; text-align: left;'>" + file.name + "</div><div style='flex:1; text-align: right;'>" + unitizeFile(file.size) + "</div></div>"
            });
            html += "<div style='margin: 30px 0;'></div>"
            if (failFlag['exceedMaxFileSizeReason']) html += getBundleString("exceedMaxFileSizeReason", [maxUploadSizeNum, maxUploadSizeUnit]);
            if (failFlag['fileTypeNotMatchContent']) html += getBundleString('fileTypeNotMatchContent', [fileExtensionFilters.join(",  ")]);
            this.maxSizeErrorMsg = html;
            return validFiles;
        }
        return files;
    };
    UploadField.prototype.createImgByFile = function () {
        const t = this;
        const webFormWidget = this.element.closest('.webFormWidget');
        const hideext = webFormWidget.hasAttribute('hideext');
        const uploadFieldPreview = this.element.querySelector('.uploadField-preview');
        uploadFieldPreview.textContent = '';
        this.value.forEach(function (val) {
            const _div = document.createElement('div');
            const imgDiv = document.createElement('div');
            imgDiv.classList.add('imgDiv');
            const img = document.createElement('img');
            img.classList.add('imgPreview');
            img.src = t.isGraphic ? getFileDownloadURL(val) : getIcon(val);
            const deleteIcon = document.createElement('i');
            deleteIcon.className = 'delete far fa-times';
            deleteIcon.addEventListener('click', function () {
                if (t.value.includes(val)) {
                    t.value = t.value.filter(function (_val) {
                        return val !== _val;
                    }).join('|');
                }
            });
            _div.appendChild(imgDiv);
            imgDiv.appendChild(img);
            if (!t.isGraphic) {
                const fileNameSpan = document.createElement('span');
                const fileNameSplit = val.split('@');
                const fileName = fileNameSplit[fileNameSplit.length - 1];
                const hiddenExtName = fileName.substring(0, fileName.indexOf('.'));
                fileNameSpan.classList.add('fileName');
                fileNameSpan.textContent = hideext ? hiddenExtName : fileName;
                imgDiv.appendChild(fileNameSpan);
            }
            uploadFieldPreview.appendChild(_div);
        });
    };
    UploadField.prototype.render = function () {
        const t = this;
        this.element = document.createElement('div');
        this.element.id = this.id;
        this.element.classList.add('uploadField');
        this.parent.appendChild(this.element);

        const uploadFieldPreview = document.createElement('div');
        uploadFieldPreview.classList.add('uploadField-preview');
        const uploadFieldUpload = document.createElement('label');
        uploadFieldUpload.classList.add('uploadField-upload');
        uploadFieldUpload.title = 'upload file';
        this.element.appendChild(uploadFieldPreview);
        this.element.appendChild(uploadFieldUpload);

        const uploadFieldUploadIcon = document.createElement('i');
        uploadFieldUploadIcon.className = 'fas fa-file-upload';
        const uploadFieldUploadInput = document.createElement('input');
        uploadFieldUploadInput.classList.add('fileAgent');
        uploadFieldUploadInput.type = 'file';
        uploadFieldUploadInput.multiple = this.multiple;
        uploadFieldUploadInput.accept = this.accept;
        uploadFieldUploadInput.title = 'upload file';
        const fieldInfo = fieldsJSON.find(function (obj) {
            return parseInt(t.domainId) === obj.domainId;
        });
        if (fieldInfo && fieldInfo.attributes['ro'] === 'true') uploadFieldUploadInput.tabIndex = -1;
        uploadFieldUpload.appendChild(uploadFieldUploadInput);
        uploadFieldUpload.appendChild(uploadFieldUploadIcon);
        uploadFieldUploadInput.addEventListener('change', this.loadFile.bind(this));
        this.input.addEventListener('change', function (event) {
            t._value = event.target.value;
            t.input.value = t.value.join('|');
            t.createImgByFile();
        });
    };
    function resizeImage(file, widget, acceptImg) {
        return new Promise(function(resolve) {
            if (widget.hasAttribute('keeporiginalsize') || !acceptImg) {
                resolve(file);
            } else {
                const ext = file.name.substring(file.name.lastIndexOf(".") + 1);
                readBlobAsDataURL(file).then(function (url) {
                    if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp") {
                        const img = new Image;
                        img.onload = function () {
                            const canvas = document.createElement('canvas');
                            let width = img.width;
                            let height = img.height;
                            const threshold = 1920;
                            if (width >= threshold && height < threshold) {
                                height *= threshold / width;
                                width = threshold;
                            } else if (width < threshold && height >= threshold) {
                                width *= threshold / height;
                                height = threshold;
                            } else if (width >= threshold && height >= threshold) {
                                if (width >= height) {
                                    height *= threshold / width;
                                    width = threshold;
                                } else {
                                    width *= threshold / height;
                                    height = threshold;
                                }
                            }
                            canvas.width = width;
                            canvas.height = height;
                            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                            const dataURL = canvas.toDataURL(ext==="png"? "" : ext==="webp" ? "image/webp" : "image/jpeg");
                            const resizedFile = new File([dataURLToBlob(dataURL)], file.name);
                            resolve(resizedFile.size < file.size ? resizedFile : file);
                        };
                        img.src = url;
                    } else {
                        resolve(file);
                    }
                });
            }
        });
    }
    return agent;
})();