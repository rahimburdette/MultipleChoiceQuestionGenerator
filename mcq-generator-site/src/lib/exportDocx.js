import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, ShadingType, TabStopType,
} from 'docx';
import { saveAs } from 'file-saver';

const COLORS = {
  emerald: '059669',
  red: 'DC2626',
  gray: '6B7280',
  lightGray: 'F3F4F6',
  darkGray: '374151',
  black: '111827',
};

function makeOrderBadge(order) {
  const colors = { '1st': '059669', '2nd': 'D97706', '3rd': 'E11D48' };
  return new TextRun({
    text: ` [${order} Order]`,
    bold: true,
    color: colors[order] || COLORS.gray,
    size: 20,
    font: 'Arial',
  });
}

function buildTeacherDoc(questions) {
  const children = [];

  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'USMLE-Style Practice Questions', bold: true, size: 36, font: 'Arial', color: COLORS.black }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Teacher Version — With Answers & Explanations', size: 22, font: 'Arial', color: COLORS.gray }),
      ],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Generated ${new Date().toLocaleDateString()} · ${questions.length} questions`, size: 20, font: 'Arial', color: COLORS.gray }),
      ],
      spacing: { after: 300 },
    })
  );

  questions.forEach((q, i) => {
    // Question header
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Question ${i + 1}`, bold: true, size: 24, font: 'Arial', color: COLORS.black }),
          makeOrderBadge(q.order),
        ],
        spacing: { before: 300, after: 80 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' } },
      })
    );

    // Lecture + LO
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Lecture: ', bold: true, size: 18, font: 'Arial', color: COLORS.gray }),
          new TextRun({ text: q.lecture || '—', size: 18, font: 'Arial', color: COLORS.darkGray }),
        ],
        spacing: { after: 40 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: 'LO: ', bold: true, size: 18, font: 'Arial', color: COLORS.gray }),
          new TextRun({ text: q.mapped_lo, size: 18, font: 'Arial', color: COLORS.darkGray }),
        ],
        spacing: { after: 160 },
      })
    );

    // Image description if present
    if (q.image_description) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '[Clinical Image: ', bold: true, italics: true, size: 20, font: 'Arial', color: '4F46E5' }),
            new TextRun({ text: q.image_description, italics: true, size: 20, font: 'Arial', color: COLORS.darkGray }),
            new TextRun({ text: ']', bold: true, italics: true, size: 20, font: 'Arial', color: '4F46E5' }),
          ],
          spacing: { after: 120 },
        })
      );
    }

    // Vignette
    children.push(
      new Paragraph({
        children: [new TextRun({ text: q.vignette, size: 22, font: 'Arial', color: COLORS.black })],
        spacing: { after: 120 },
      })
    );

    // Lead-in
    children.push(
      new Paragraph({
        children: [new TextRun({ text: q.lead_in, bold: true, size: 22, font: 'Arial', color: COLORS.black })],
        spacing: { after: 120 },
      })
    );

    // Options
    Object.entries(q.options).forEach(([letter, text]) => {
      const isCorrect = letter === q.correct_answer;
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${letter}. `,
              bold: true,
              size: 22,
              font: 'Arial',
              color: isCorrect ? COLORS.emerald : COLORS.black,
            }),
            new TextRun({
              text: text,
              size: 22,
              font: 'Arial',
              color: isCorrect ? COLORS.emerald : COLORS.black,
              bold: isCorrect,
            }),
            ...(isCorrect ? [new TextRun({ text: '  ✓', bold: true, size: 22, font: 'Arial', color: COLORS.emerald })] : []),
          ],
          spacing: { after: 40 },
          indent: { left: 360 },
        })
      );
    });

    // Correct answer
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Correct Answer: ', bold: true, size: 22, font: 'Arial', color: COLORS.emerald }),
          new TextRun({ text: q.correct_answer, bold: true, size: 22, font: 'Arial', color: COLORS.emerald }),
        ],
        spacing: { before: 160, after: 80 },
        shading: { type: ShadingType.CLEAR, fill: 'F0FDF4' },
      })
    );

    // Explanation
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Explanation: ', bold: true, size: 20, font: 'Arial', color: COLORS.darkGray }),
          new TextRun({ text: q.explanation, size: 20, font: 'Arial', color: COLORS.darkGray }),
        ],
        spacing: { after: 120 },
      })
    );

    // Distractor explanations
    if (q.distractor_explanations) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Distractor Analysis:', bold: true, size: 20, font: 'Arial', color: COLORS.gray })],
          spacing: { after: 60 },
        })
      );
      Object.entries(q.distractor_explanations).forEach(([letter, text]) => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${letter}. `, bold: true, size: 20, font: 'Arial', color: COLORS.gray }),
              new TextRun({ text: text, size: 20, font: 'Arial', color: COLORS.gray }),
            ],
            spacing: { after: 30 },
            indent: { left: 360 },
          })
        );
      });
    }
  });

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });
}

function buildStudentDoc(questions) {
  const children = [];

  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'USMLE-Style Practice Questions', bold: true, size: 36, font: 'Arial', color: COLORS.black }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `${questions.length} questions · ${new Date().toLocaleDateString()}`, size: 20, font: 'Arial', color: COLORS.gray }),
      ],
      spacing: { after: 300 },
    })
  );

  questions.forEach((q, i) => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `Question ${i + 1}`, bold: true, size: 24, font: 'Arial', color: COLORS.black }),
        ],
        spacing: { before: 300, after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' } },
      })
    );

    if (q.image_description) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '[Clinical Image: ', bold: true, italics: true, size: 20, font: 'Arial', color: '4F46E5' }),
            new TextRun({ text: q.image_description, italics: true, size: 20, font: 'Arial', color: COLORS.darkGray }),
            new TextRun({ text: ']', bold: true, italics: true, size: 20, font: 'Arial', color: '4F46E5' }),
          ],
          spacing: { after: 120 },
        })
      );
    }

    children.push(
      new Paragraph({
        children: [new TextRun({ text: q.vignette, size: 22, font: 'Arial', color: COLORS.black })],
        spacing: { after: 120 },
      }),
      new Paragraph({
        children: [new TextRun({ text: q.lead_in, bold: true, size: 22, font: 'Arial', color: COLORS.black })],
        spacing: { after: 120 },
      })
    );

    Object.entries(q.options).forEach(([letter, text]) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${letter}. `, bold: true, size: 22, font: 'Arial', color: COLORS.black }),
            new TextRun({ text: text, size: 22, font: 'Arial', color: COLORS.black }),
          ],
          spacing: { after: 40 },
          indent: { left: 360 },
        })
      );
    });

    // Answer line for students to write on
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Your Answer: _____', size: 22, font: 'Arial', color: COLORS.gray }),
        ],
        spacing: { before: 120, after: 80 },
      })
    );
  });

  return new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });
}

export async function exportToDocx(questions) {
  // Teacher version
  const teacherDoc = buildTeacherDoc(questions);
  const teacherBlob = await Packer.toBlob(teacherDoc);
  saveAs(teacherBlob, 'MCQ_Questions_Teacher_Version.docx');

  // Student version (slight delay to avoid browser blocking second download)
  setTimeout(async () => {
    const studentDoc = buildStudentDoc(questions);
    const studentBlob = await Packer.toBlob(studentDoc);
    saveAs(studentBlob, 'MCQ_Questions_Student_Version.docx');
  }, 600);
}
