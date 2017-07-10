/**
 * Library for creating a drag-and-drop XLSX workbook file parser and
 * processor.
 */
 
var DropSheet = function DropSheet(opts, sheets) {
  var workbook_js = {'Book':null};
    
  if(!opts) opts = {};
  var nullfunc = function(){};
  if(!opts.errors) opts.errors = {};
  if(!opts.errors.badfile) opts.errors.badfile = nullfunc;
  if(!opts.errors.pending) opts.errors.pending = nullfunc;
  if(!opts.errors.failed) opts.errors.failed = nullfunc;
  if(!opts.errors.large) opts.errors.large = nullfunc;
  if(!opts.on) opts.on = {};
  if(!opts.on.workstart) opts.on.workstart = nullfunc;
  if(!opts.on.workend) opts.on.workend = nullfunc;
  if(!opts.on.sheet) opts.on.sheet = nullfunc;
  if(!opts.on.wb) opts.on.wb = nullfunc;

  var rABS = typeof FileReader !== 'undefined' && typeof FileReader.prototype !== 'undefined' && typeof FileReader.prototype.readAsBinaryString !== 'undefined';
  var useworker = typeof Worker !== 'undefined';
  var pending = false;

  function readFile(files) {
    var i,f;
    for (i = 0, f = files[i]; i != files.length; ++i) {
      var reader = new FileReader();
      var name = f.name;
      reader.onload = function(e) {
        var data = e.target.result;
        var wb, arr, xls = false;
        var readtype = {type: rABS ? 'binary' : 'base64' };
        if (!rABS) {
          arr = fixdata(data);
          data = btoa(arr);
        }
        function doit() {
          try {
            if (useworker) { sheetjsw(data, process_wb, readtype, xls); return; }
            wb = XLSX.read(data, readtype);
            process_wb(wb, 'XLSX');
          } catch(e) { opts.errors.failed(e); }
        }

        if (e.target.result.length > 500000) opts.errors.large(e.target.result.length, function(e) { if (e) doit(); });
        else { doit(); }
      };
      if (rABS) reader.readAsBinaryString(f);
      else reader.readAsArrayBuffer(f);
    }
  }

  function fixdata(data) {
    var o = "", l = 0, w = 10240;
    for(; l<data.byteLength/w; ++l)
      o+=String.fromCharCode.apply(null,new Uint8Array(data.slice(l*w,l*w+w)));
    o+=String.fromCharCode.apply(null, new Uint8Array(data.slice(o.length)));
    return o;
  }

  function sheetjsw(data, cb, readtype, xls) {
    pending = true;
    opts.on.workstart();
    var scripts = document.getElementsByTagName('script');
    var path;
    for (var i = 0; i < scripts.length; i++)
      if (scripts[i].src.indexOf('path') != -1)
        path = scripts[i].src.split('path.js')[0];
    var worker = new Worker(path + 'sheetjs.worker.js');
    worker.onmessage = function(e) {
      switch(e.data.t) {
        case 'ready': break;
        case 'e': pending = false; console.error(e.data.d); break;
        case 'xls': case 'xlsx': pending = false;
          opts.on.workend();
          cb(JSON.parse(e.data.d), e.data.t); break;
      }
    };
    worker.postMessage({d:data,b:readtype,t:'xlsx'});
  }

  var last_wb, last_type;

  function to_json(workbook, type) {
    var XL = type.toUpperCase() === 'XLS' ? XLS : XLSX;
    if (useworker && workbook.SSF) XLS.SSF.load_table(workbook.SSF);
    var result = {};
    workbook.SheetNames.forEach(function(sheetName) {
      var roa = XL.utils.sheet_to_row_object_array(workbook.Sheets[sheetName], {raw:true});
      if (roa.length > 0) result[sheetName] = roa;
    });
    return result;
  }

  function get_columns(sheet, type) {
    var val, rowObject, range, columnHeaders, emptyRow, C;
    if (!sheet['!ref']) return [];
    range = XLS.utils.decode_range(sheet["!ref"]);
    columnHeaders = [];
    for (C = range.s.c; C <= range.e.c; ++C) {
      val = sheet[XLS.utils.encode_cell({c: C, r: range.s.r})];
      if (!val) continue;
      columnHeaders[C] = type.toLowerCase() == 'xls' ? XLS.utils.format_cell(val) : val.v;
    }
    return columnHeaders;
  }

  function choose_sheet(sheetidx) { process_wb(last_wb, last_type, sheetidx); }

  function process_wb(wb, type, sheetidx) {
    if (sheetidx == null)
      for (sheetidx = 0; sheetidx < wb.SheetNames.length; sheetidx++)
        if (wb.SheetNames[sheetidx] in sheets)
          break;

    last_wb = wb;
    last_type = type;
    opts.on.wb(wb, type, sheetidx);
    var sheet = wb.SheetNames[sheetidx||0];
    if (type.toLowerCase() == 'xls' && wb.SSF) XLS.SSF.load_table(wb.SSF);
    workbook_js['Book'] = to_json(wb, type);
    var json = workbook_js['Book'][sheet], cols = get_columns(wb.Sheets[sheet], type);
    opts.on.sheet(json, cols, wb.SheetNames, choose_sheet);
  }

  function handleDrop(e) {
    if (typeof jQuery !== 'undefined') {
      e.stopPropagation();
      e.preventDefault();
      if (pending) return opts.errors.pending();
      var files = e.dataTransfer.files;
      $('#drop-area').removeClass('dragenter');
      readFile(files);
    } else {
      alertify.alert("<img src='style/cancel.png' alt='Error'>Error!", "Drag and drop not supported. Please use the 'Choose File' button.");
    }
  }

  function handleDragover(e) {
    if (typeof jQuery !== 'undefined') {
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      $('#drop-area').removeClass('dragdefault');
      $('#drop-area').addClass('dragenter');
    } else {
      alertify.alert("<img src='style/cancel.png' alt='Error'>Error!", "Drag and drop not supported. Please use the 'Choose file' button.");
    }
  }

  function handleDragleave(e) {
    if (typeof jQuery !== 'undefined') {
      $('#drop-area').removeClass('dragenter');
    } else {
      alertify.alert("<img src='style/cancel.png' alt='Error'>Error!", "Drag and drop not supported. Please use the 'Choose file' button.");
    }
  }

  function handleClick(e) {
    if (typeof jQuery !== 'undefined') {
      $('#choose-file').click();
    } else {
      alertify.alert("<img src='style/cancel.png' alt='Error'>Error!", "Drag and drop not supported. Please use the 'Choose file' button.");
    }
  }

  if (opts.drop.addEventListener) {
    opts.drop.addEventListener('dragenter', handleDragover, false);
    opts.drop.addEventListener('dragleave', handleDragleave);
    opts.drop.addEventListener('dragover', handleDragover, false);
    opts.drop.addEventListener('drop', handleDrop, false);
    opts.choose.addEventListener('click', handleClick, false);
  }

  // For choosing a file using <input> (i.e., "Choose file" button).
  function handleFile(e) {
    console.log("Here!");
    var files = e.target.files;
    if (window.FileReader) {
      // FileReader is supported.
      readFile(files);
    } else {
      alertify.alert("<img src='style/cancel.png' alt='Error'>Error!", "FileReader is not supported in this browser.");
    }
  }

  if (opts.choose.addEventListener) {
    if (typeof jQuery !== 'undefined') {
      $('#choose-file').change(handleFile);
      //opts.choose.addEventListener('change', handleFile, false);
    }
  }

  return workbook_js;
};

/* eof */