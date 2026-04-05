import { Document, Page, Text, View, StyleSheet, Font, pdf } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 50, fontFamily: 'Helvetica', fontSize: 10, color: '#2e2c2a', lineHeight: 1.5 },
  header: { marginBottom: 30, borderBottom: '2pt solid #b06050', paddingBottom: 15 },
  logo: { fontSize: 22, fontWeight: 'bold', color: '#b06050', fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  subtitle: { fontSize: 9, color: '#8a8682', marginTop: 4, textTransform: 'uppercase', letterSpacing: 2 },
  title: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#2e2c2a', marginBottom: 6 },
  date: { fontSize: 9, color: '#8a8682', marginBottom: 20 },
  clientBox: { backgroundColor: '#f8f6f4', borderRadius: 6, padding: 14, marginBottom: 20 },
  clientLabel: { fontSize: 8, color: '#8a8682', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  clientName: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#2e2c2a' },
  clientDetail: { fontSize: 9, color: '#6b6764', marginTop: 2 },
  sectionTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#b06050', marginTop: 20, marginBottom: 8, borderBottom: '1pt solid #e0ddd8', paddingBottom: 4 },
  tierBadge: { fontSize: 9, color: '#fff', backgroundColor: '#b06050', borderRadius: 10, padding: '3 10', alignSelf: 'flex-start', marginBottom: 10 },
  feature: { fontSize: 9, color: '#3e3c3a', marginBottom: 3, paddingLeft: 10 },
  stageRow: { flexDirection: 'row', marginBottom: 10, borderLeft: '2pt solid #b06050', paddingLeft: 10 },
  stageNumber: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#b06050', width: 20 },
  stageLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#2e2c2a', flex: 1 },
  stageCount: { fontSize: 8, color: '#8a8682' },
  task: { fontSize: 8.5, color: '#5a5856', marginBottom: 2, paddingLeft: 30 },
  addonRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottom: '0.5pt solid #eee' },
  addonName: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#2e2c2a', flex: 1 },
  addonDesc: { fontSize: 8, color: '#8a8682', flex: 2 },
  addonPrice: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#b06050', width: 80, textAlign: 'right' },
  summaryBox: { backgroundColor: '#faf8f6', borderRadius: 6, padding: 16, marginTop: 20, borderLeft: '3pt solid #b06050' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { fontSize: 9, color: '#6b6764' },
  summaryValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#2e2c2a' },
  footer: { position: 'absolute', bottom: 30, left: 50, right: 50, borderTop: '0.5pt solid #e0ddd8', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 7, color: '#b0ada9' },
  signatureLine: { marginTop: 40, borderTop: '1pt solid #2e2c2a', width: 200, paddingTop: 4 },
  signatureLabel: { fontSize: 8, color: '#8a8682' },
});

const ProposalDocument = ({ proposal }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>LABNO LABS</Text>
        <Text style={styles.subtitle}>Intelligent Systems & Consulting</Text>
      </View>

      {/* Title */}
      <Text style={styles.title}>{proposal.title}</Text>
      <Text style={styles.date}>Prepared {proposal.date}</Text>

      {/* Client Info */}
      <View style={styles.clientBox}>
        <Text style={styles.clientLabel}>Prepared For</Text>
        <Text style={styles.clientName}>{proposal.client.name}</Text>
        <Text style={styles.clientDetail}>{proposal.client.company}</Text>
        {proposal.client.email && <Text style={styles.clientDetail}>{proposal.client.email}</Text>}
      </View>

      {/* Tier */}
      <Text style={styles.sectionTitle}>Service Tier</Text>
      <View style={{ ...styles.tierBadge, backgroundColor: proposal.tier.color || '#b06050' }}>
        <Text style={{ color: '#fff', fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{proposal.tier.label}</Text>
      </View>
      <Text style={{ fontSize: 9, color: '#6b6764', marginBottom: 8 }}>
        Track: {proposal.track === 'app' ? 'App Build' : 'Service Build'}
      </Text>

      {/* Features */}
      <Text style={styles.sectionTitle}>Included Features</Text>
      {proposal.features.map((f, i) => (
        <Text key={i} style={styles.feature}>• {f}</Text>
      ))}

      {/* Pipeline Stages */}
      <Text style={styles.sectionTitle}>Project Phases ({proposal.totalTasks} Deliverables)</Text>
      {proposal.stages.map(s => (
        <View key={s.number} wrap={false}>
          <View style={styles.stageRow}>
            <Text style={styles.stageNumber}>{s.number}.</Text>
            <Text style={styles.stageLabel}>{s.label}</Text>
            <Text style={styles.stageCount}>{s.tasks.length} deliverables</Text>
          </View>
          {s.tasks.map((t, i) => (
            <Text key={i} style={styles.task}>— {t.title}</Text>
          ))}
        </View>
      ))}

      {/* Add-Ons */}
      {proposal.addOns.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Add-On Modules</Text>
          {proposal.addOns.map(a => (
            <View key={a.id} style={styles.addonRow}>
              <Text style={styles.addonName}>{a.label}</Text>
              <Text style={styles.addonDesc}>{a.desc}</Text>
              <Text style={styles.addonPrice}>{a.price}</Text>
            </View>
          ))}
        </>
      )}

      {/* Summary */}
      <View style={styles.summaryBox}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Deliverables</Text>
          <Text style={styles.summaryValue}>{proposal.totalTasks}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service Tier</Text>
          <Text style={styles.summaryValue}>{proposal.tier.label}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Pipeline Track</Text>
          <Text style={styles.summaryValue}>{proposal.track === 'app' ? 'App Build' : 'Service Build'}</Text>
        </View>
        {proposal.addOns.length > 0 && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Add-On Modules</Text>
            <Text style={styles.summaryValue}>{proposal.addOns.length}</Text>
          </View>
        )}
      </View>

      {/* Signature */}
      <View style={{ marginTop: 40, flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Client Signature</Text>
        </View>
        <View>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureLabel}>Date</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>Labno Labs · labnolabs.com</Text>
        <Text style={styles.footerText}>Confidential</Text>
      </View>
    </Page>
  </Document>
);

// Helper to generate and download PDF
export const downloadProposalPDF = async (proposal) => {
  const blob = await pdf(<ProposalDocument proposal={proposal} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Proposal_${(proposal.client.company || 'Client').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

export default ProposalDocument;
