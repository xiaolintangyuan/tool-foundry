import { PDFDocument, rgb, PageSizes, StandardFonts } from 'pdf-lib';
import { v7 as uuidv7 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

const SitePath = `http://localhost:${process.env.GATEWAY_PORT}/pdfs/`;

export const makePDFTool = {
    name: 'makepdf',
    description: 'Pass in the subject and content to create a PDF file',
    parameters: {
        type: 'object',
        properties: {
            subject: {
                type: 'string',
                description: 'The subject or title of the PDF'
            },
            content: {
                type: 'string',
                description: 'The content to include in the PDF'
            },
            paperSize: {
                type: 'string',
                enum: ['A4', 'Letter', 'Legal'],
                default: 'A4',
                description: 'The paper size for the PDF'
            },
            orientation: {
                type: 'string',
                enum: ['portrait', 'landscape'],
                default: 'portrait',
                description: 'The orientation of the PDF'
            },
            margins: {
                type: 'object',
                properties: {
                    top: { type: 'number', default: 50 },
                    bottom: { type: 'number', default: 50 },
                    left: { type: 'number', default: 50 },
                    right: { type: 'number', default: 50 }
                },
                description: 'Margins for the PDF content in points'
            }
        },
        required: ['subject', 'content'],
    },
    function: async (args: { subject: string; content: string; paperSize?: string; orientation?: string; margins?: { top: number; bottom: number; left: number; right: number } }): Promise<{ link: string }> => {
        const { subject, content, paperSize = 'A4', orientation = 'portrait', margins = { top: 50, bottom: 50, left: 50, right: 50 } } = args;

        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();

        // Embed the standard font
        const font = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);

        // Determine page size
        let pageSize = PageSizes.A4;
        if (paperSize === 'Letter') pageSize = PageSizes.Letter;
        else if (paperSize === 'Legal') pageSize = PageSizes.Legal;

        // Adjust for orientation
        if (orientation === 'landscape') {
            pageSize = [pageSize[1], pageSize[0]];
        }

        const page = pdfDoc.addPage(pageSize);
        const { width, height } = page.getSize();

        // Define font size and line height
        const titleSize = 24;
        const contentSize = 12;
        const lineHeight = contentSize * 1.2; // Line height for content

        // Calculate available width for text
        const availableWidth = width - margins.left - margins.right;

        // Add subject as title
        page.drawText(subject, { x: margins.left, y: height - margins.top, size: titleSize, color: rgb(0, 0, 0), font });

        // Function to wrap text
        const wrapText = (text: string, fontSize: number, maxWidth: number): string[] => {
            // First split by existing newlines
            const paragraphs = text.split('\n');
            const lines: string[] = [];

            for (const paragraph of paragraphs) {
                const words = paragraph.split(' ');
                let currentLine = '';

                for (const word of words) {
                    const testLine = currentLine ? `${currentLine} ${word}` : word;
                    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

                    if (testWidth <= maxWidth) {
                        currentLine = testLine;
                    } else {
                        if (currentLine) {
                            lines.push(currentLine);
                        }
                        currentLine = word;
                    }
                }

                if (currentLine) {
                    lines.push(currentLine);
                }
            }

            return lines;
        };

        // Wrap content text
        const contentLines = wrapText(content, contentSize, availableWidth);

        // Draw content lines with pagination
        let currentY = height - margins.top - titleSize - 20; // Start below title
        let currentPage = page;

        for (const line of contentLines) {
            // Check if we need a new page
            if (currentY - lineHeight < margins.bottom) {
                currentPage = pdfDoc.addPage(pageSize);
                currentY = height - margins.top;
            }

            // Draw the line
            currentPage.drawText(line, { x: margins.left, y: currentY, size: contentSize, color: rgb(0, 0, 0), font });

            // Move to next line
            currentY -= lineHeight;
        }

        // Serialize the PDF
        const pdfBytes = await pdfDoc.save();

        // Generate a unique filename using UUID v7
        const filename = `${uuidv7()}.pdf`;

        // Ensure the pdfs directory exists
        const dir = path.join(process.cwd(), 'pdfs');
        await fs.ensureDir(dir);

        // Write the PDF to the file
        const filePath = path.join(dir, filename);
        await fs.writeFile(filePath, pdfBytes);

        // Return the path that can be used by the server for download
        return { link: `${SitePath}${filename}` };
    },
}

export const makeInvoiceTool = {
    name: 'makeinvoice',
    description: 'Generate an invoice PDF from provided data using the invoice template',
    parameters: {
        type: 'object',
        properties: {
            companyName: { type: 'string', description: 'Company name' },
            companyAddress: { type: 'string', description: 'Company address (multi-line)' },
            companyPhone: { type: 'string', description: 'Company phone number' },
            companyEmail: { type: 'string', description: 'Company email' },
            billToName: { type: 'string', description: 'Bill to name' },
            billToAddress: { type: 'string', description: 'Bill to address (multi-line)' },
            billToEmail: { type: 'string', description: 'Bill to email' },
            shipToName: { type: 'string', description: 'Ship to name (optional, defaults to bill to)' },
            shipToAddress: { type: 'string', description: 'Ship to address (optional, defaults to bill to)' },
            invoiceNumber: { type: 'string', description: 'Invoice number (optional, auto-generated if not provided)' },
            invoiceDate: { type: 'string', description: 'Invoice date in YYYY-MM-DD format (optional, defaults to today)' },
            dueDate: { type: 'string', description: 'Due date in YYYY-MM-DD format (optional, defaults to 14 days later)' },
            items: {
                type: 'array',
                description: 'List of invoice items',
                items: {
                    type: 'object',
                    properties: {
                        description: { type: 'string', description: 'Item description' },
                        quantity: { type: 'number', description: 'Quantity' },
                        unitPrice: { type: 'number', description: 'Unit price' },
                        taxRate: { type: 'number', description: 'Tax rate in percent (e.g., 10 for 10%)' }
                    },
                    required: ['description', 'quantity', 'unitPrice', 'taxRate']
                }
            },
            notes: { type: 'string', description: 'Additional notes (optional)' }
        },
        required: ['companyName', 'companyAddress', 'companyPhone', 'companyEmail', 'billToName', 'billToAddress', 'billToEmail', 'items']
    },
    function: async (args: {
        companyName: string;
        companyAddress: string;
        companyPhone: string;
        companyEmail: string;
        billToName: string;
        billToAddress: string;
        billToEmail: string;
        shipToName?: string;
        shipToAddress?: string;
        invoiceNumber?: string;
        invoiceDate?: string;
        dueDate?: string;
        items: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number }>;
        notes?: string;
    }): Promise<{ link: string }> => {
        const {
            companyName,
            companyAddress,
            companyPhone,
            companyEmail,
            billToName,
            billToAddress,
            billToEmail,
            shipToName = billToName,
            shipToAddress = billToAddress,
            invoiceNumber,
            invoiceDate,
            dueDate,
            items,
            notes = 'Thank you for your business! Payment is due within 14 days.'
        } = args;

        // Read the HTML template
        const templatePath = path.join(process.cwd(), 'templates', 'invoice.html');
        const templateHtml = await fs.readFile(templatePath, 'utf-8');

        // Load HTML with cheerio
        const $ = cheerio.load(templateHtml);

        // Remove interactive elements for PDF
        $('.no-print').remove();
        $('#saveBtn, #printBtn, #addItemBtn, .delete-item').remove();

        // Fill in company info
        $('#companyName').text(companyName);
        $('#companyAddress').html(companyAddress.replace(/\n/g, '<br>'));
        $('#companyPhone').text(companyPhone);
        $('#companyEmail').text(companyEmail);

        // Fill in bill to
        $('#billToName').text(billToName);
        $('#billToAddress').html(billToAddress.replace(/\n/g, '<br>'));
        $('#billToEmail').text(billToEmail);

        // Fill in ship to
        $('#shipToName').text(shipToName);
        $('#shipToAddress').html(shipToAddress.replace(/\n/g, '<br>'));

        // Invoice details
        const invNumber = invoiceNumber || `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
        $('#invoiceNumber').text(invNumber);

        const invDate = invoiceDate || new Date().toISOString().split('T')[0];
        $('#invoiceDate').text(invDate);

        const due = dueDate || (() => {
            const d = new Date(invDate);
            d.setDate(d.getDate() + 14);
            return d.toISOString().split('T')[0];
        })();
        $('#dueDate').text(due);

        // Generate items table
        const itemsTable = $('#itemsTable');
        itemsTable.empty(); // Remove existing sample items

        let subtotal = 0;
        let taxTotal = 0;

        items.forEach(item => {
            const { description, quantity, unitPrice, taxRate } = item;
            const itemSubtotal = quantity * unitPrice;
            const itemTax = itemSubtotal * (taxRate / 100);
            const total = itemSubtotal + itemTax;

            subtotal += itemSubtotal;
            taxTotal += itemTax;

            const row = `
                <tr class="item-row">
                    <td>${description}</td>
                    <td class="text-right">${quantity}</td>
                    <td class="text-right">$${unitPrice.toFixed(2)}</td>
                    <td class="text-right">${taxRate}%</td>
                    <td class="text-right font-medium">$${total.toFixed(2)}</td>
                </tr>
            `;
            itemsTable.append(row);
        });

        const grandTotal = subtotal + taxTotal;

        // Update totals
        $('#subtotal').text(`$${subtotal.toFixed(2)}`);
        $('#taxTotal').text(`$${taxTotal.toFixed(2)}`);
        $('#grandTotal').text(`$${grandTotal.toFixed(2)}`);

        // Notes
        $('#notes').text(notes);

        // Get the modified HTML
        const modifiedHtml = $.html();

        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(modifiedHtml, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        // Generate unique filename
        const filename = `${uuidv7()}.pdf`;

        // Ensure pdfs directory exists
        const dir = path.join(process.cwd(), 'pdfs');
        await fs.ensureDir(dir);

        // Write PDF to file
        const filePath = path.join(dir, filename);
        await fs.writeFile(filePath, pdfBuffer);

        // Return the link
        return { link: `${SitePath}${filename}` };
    },
}

export const makeBillOfLadingTool = {
    name: 'makebilloflading',
    description: 'Generate a Bill of Lading PDF from provided data using the bill of lading template',
    parameters: {
        type: 'object',
        properties: {
            carrierName: { type: 'string', description: 'Carrier company name' },
            carrierAddress: { type: 'string', description: 'Carrier address (multi-line)' },
            bolNumber: { type: 'string', description: 'Bill of Lading number (optional, auto-generated if not provided)' },
            refNumber: { type: 'string', description: 'Reference number (optional, auto-generated if not provided)' },
            shipperName: { type: 'string', description: 'Shipper name' },
            shipperAddress: { type: 'string', description: 'Shipper address (multi-line)' },
            consigneeType: { type: 'string', enum: ['toOrder', 'toOrderOf', 'straight', 'bearer'], default: 'straight', description: 'Consignee type' },
            consigneeName: { type: 'string', description: 'Consignee name' },
            consigneeAddress: { type: 'string', description: 'Consignee address (multi-line)' },
            consigneeToOrderOf: { type: 'string', description: 'To Order Of party (required if consigneeType is toOrderOf)' },
            notifyName: { type: 'string', description: 'Notify party name' },
            notifyAddress: { type: 'string', description: 'Notify party address (multi-line)' },
            vesselName: { type: 'string', description: 'Vessel name' },
            voyageNumber: { type: 'string', description: 'Voyage number' },
            loadingPort: { type: 'string', description: 'Port of loading' },
            receiptPlace: { type: 'string', description: 'Place of receipt (optional)' },
            dischargePort: { type: 'string', description: 'Port of discharge' },
            deliveryPlace: { type: 'string', description: 'Place of delivery (optional)' },
            items: {
                type: 'array',
                description: 'List of cargo items',
                items: {
                    type: 'object',
                    properties: {
                        marks: { type: 'string', description: 'Marks and numbers' },
                        description: { type: 'string', description: 'Description of goods' },
                        weight: { type: 'number', description: 'Gross weight in Kgs' },
                        measurement: { type: 'number', description: 'Measurement in CBM' }
                    },
                    required: ['marks', 'description', 'weight', 'measurement']
                }
            },
            freightType: { type: 'string', enum: ['prepaid', 'collect'], default: 'prepaid', description: 'Freight payment type' },
            freightAmount: { type: 'string', description: 'Freight amount (e.g., USD 5,250.00)' },
            freightRate: { type: 'string', description: 'Freight rate (e.g., USD 350.00 per CBM)' },
            originalCount: { type: 'number', enum: [1, 2, 3, 4], default: 3, description: 'Number of original bills' },
            copyCount: { type: 'string', description: 'Number of copies' },
            issuePlace: { type: 'string', description: 'Place of issue' },
            issueDate: { type: 'string', description: 'Date of issue in YYYY-MM-DD format (optional, defaults to today)' },
            signatoryName: { type: 'string', description: 'Signatory name' },
            signatoryTitle: { type: 'string', description: 'Signatory title' }
        },
        required: ['carrierName', 'carrierAddress', 'shipperName', 'shipperAddress', 'consigneeName', 'consigneeAddress', 'notifyName', 'notifyAddress', 'vesselName', 'voyageNumber', 'loadingPort', 'dischargePort', 'items', 'freightAmount', 'freightRate', 'issuePlace', 'signatoryName', 'signatoryTitle']
    },
    function: async (args: {
        carrierName: string;
        carrierAddress: string;
        bolNumber?: string;
        refNumber?: string;
        shipperName: string;
        shipperAddress: string;
        consigneeType?: string;
        consigneeName: string;
        consigneeAddress: string;
        consigneeToOrderOf?: string;
        notifyName: string;
        notifyAddress: string;
        vesselName: string;
        voyageNumber: string;
        loadingPort: string;
        receiptPlace?: string;
        dischargePort: string;
        deliveryPlace?: string;
        items: Array<{ marks: string; description: string; weight: number; measurement: number }>;
        freightType?: string;
        freightAmount: string;
        freightRate: string;
        originalCount?: number;
        copyCount?: string;
        issuePlace: string;
        issueDate?: string;
        signatoryName: string;
        signatoryTitle: string;
    }): Promise<{ link: string }> => {
        const {
            carrierName,
            carrierAddress,
            bolNumber,
            refNumber,
            shipperName,
            shipperAddress,
            consigneeType = 'straight',
            consigneeName,
            consigneeAddress,
            consigneeToOrderOf,
            notifyName,
            notifyAddress,
            vesselName,
            voyageNumber,
            loadingPort,
            receiptPlace = '',
            dischargePort,
            deliveryPlace = '',
            items,
            freightType = 'prepaid',
            freightAmount,
            freightRate,
            originalCount = 3,
            copyCount = '3',
            issuePlace,
            issueDate,
            signatoryName,
            signatoryTitle
        } = args;

        // Read the HTML template
        const templatePath = path.join(process.cwd(), 'templates', 'billoflading.html');
        const templateHtml = await fs.readFile(templatePath, 'utf-8');

        // Load HTML with cheerio
        const $ = cheerio.load(templateHtml);

        // Remove interactive elements for PDF
        $('.no-print').remove();
        $('#saveBtn, #printBtn, #addItemBtn, .delete-item').remove();

        // Fill in carrier info
        $('#carrierAddress').html(carrierAddress.replace(/\n/g, '<br>'));

        // BOL numbers
        const bolNum = bolNumber || `BOL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        $('#bolNumber').text(bolNum);

        const refNum = refNumber || `REF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        $('#refNumber').text(refNum);

        // Shipper
        $('#shipperName').text(shipperName);
        $('#shipperAddress').html(shipperAddress.replace(/\n/g, '<br>'));

        // Consignee
        $('#consigneeType').val(consigneeType);
        $('#consigneeName').text(consigneeName);
        $('#consigneeAddress').html(consigneeAddress.replace(/\n/g, '<br>'));
        if (consigneeType === 'toOrderOf' && consigneeToOrderOf) {
            $('#consigneeToOrderOf input').val(consigneeToOrderOf);
        }

        // Notify Party
        $('#notifyName').text(notifyName);
        $('#notifyAddress').html(notifyAddress.replace(/\n/g, '<br>'));

        // Vessel and Voyage
        $('#vesselName').text(vesselName);
        $('#voyageNumber').text(voyageNumber);

        // Ports
        $('#loadingPort').text(loadingPort);
        $('#receiptPlace').text(receiptPlace);
        $('#dischargePort').text(dischargePort);
        $('#deliveryPlace').text(deliveryPlace);

        // Generate items table
        const goodsTable = $('#goodsTable');
        goodsTable.empty(); // Remove existing sample items

        let totalWeight = 0;
        let totalMeasurement = 0;

        items.forEach(item => {
            const { marks, description, weight, measurement } = item;
            totalWeight += weight;
            totalMeasurement += measurement;

            const row = `
                <tr class="item-row">
                    <td>${marks.replace(/\n/g, '<br>')}</td>
                    <td>${description.replace(/\n/g, '<br>')}</td>
                    <td class="text-right">${weight}</td>
                    <td class="text-right">${measurement.toFixed(2)}</td>
                </tr>
            `;
            goodsTable.append(row);
        });

        // Update totals
        $('#totalPackages').text(`${items.length} Items`);
        $('#totalWeight').text(`${totalWeight.toLocaleString()} Kgs`);
        $('#totalMeasurement').text(`${totalMeasurement.toFixed(2)} CBM`);

        // Freight
        $('#freightType').val(freightType);
        $('#freightAmount').text(freightAmount);
        $('#freightRate').text(freightRate);

        // Original count
        $('#originalCount').val(originalCount.toString());
        $('#copyCount').text(copyCount);

        // Issue details
        $('#issuePlace').text(issuePlace);
        const issueDt = issueDate || new Date().toISOString().split('T')[0];
        $('#issueDate').text(issueDt);

        // Signature
        $('#signatoryName').text(signatoryName);
        $('#signatoryTitle').text(signatoryTitle);

        // Get the modified HTML
        const modifiedHtml = $.html();

        // Generate PDF using Puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(modifiedHtml, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        // Generate unique filename
        const filename = `${uuidv7()}.pdf`;

        // Ensure pdfs directory exists
        const dir = path.join(process.cwd(), 'pdfs');
        await fs.ensureDir(dir);

        // Write PDF to file
        const filePath = path.join(dir, filename);
        await fs.writeFile(filePath, pdfBuffer);

        // Return the link
        return { link: `${SitePath}${filename}` };
    },
}
export default {
    makePDFTool,
    makeInvoiceTool,
    makeBillOfLadingTool
}